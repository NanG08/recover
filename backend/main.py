import os
import logging
import httpx
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .security import verify_signature
from .voice_service import VoiceService
from .fsm_engine import FSMEngine
from .models import RazorpayWebhookPayload
from .intent_nlu import IntentRecognizer
from .twilio_client import TwilioClient
from .utils import get_redis, get_db

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

app = FastAPI(title="Razorpay Revenue Recovery Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

intent_recognizer = IntentRecognizer()
whatsapp_client   = TwilioClient()
voice_service     = VoiceService()
fsm_engine        = FSMEngine(intent_recognizer, whatsapp_client, voice_service)

connected_ws: list[WebSocket] = []


def normalize_phone(value: str) -> str:
    return (
        value.lower()
        .replace("whatsapp:", "")
        .replace("@c.us", "")
        .replace("+", "")
        .replace(" ", "")
        .strip()
    )


class WhatsAppSendRequest(BaseModel):
    to: str
    amount: int
    customer_name: str = "Customer"
    payment_link: str = ""

class VoiceCallRequest(BaseModel):
    to: str
    amount: int


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    await get_redis()
    get_db()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    redis = await get_redis()
    await redis.aclose()
    db = get_db()
    db.close()
    logger.info("Shutdown complete")


# ---------------------------------------------------------------------------
# Health + Demo
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/demo")
async def demo_webhook(background_tasks: BackgroundTasks):
    import random, uuid
    fake = RazorpayWebhookPayload(
        event="payment.failed",
        payment_id=f"demo_{uuid.uuid4().hex[:8]}",
        amount=random.randint(1000, 50000),
        channel=random.choice(["WHATSAPP", "VOICE"]),
        language=random.choice(["en", "hi", "hr"]),
        notes={"demo": True},
    )
    background_tasks.add_task(process_event, fake)
    return {"status": "demo_sent"}


# ---------------------------------------------------------------------------
# Razorpay webhook
# ---------------------------------------------------------------------------

@app.post("/webhook")
async def razorpay_webhook(request: Request, background_tasks: BackgroundTasks):
    raw_body  = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    secret    = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if secret and not verify_signature(raw_body, signature, secret):
        raise HTTPException(status_code=400, detail="Invalid signature")
    payload = RazorpayWebhookPayload.model_validate_json(raw_body)
    background_tasks.add_task(process_event, payload)
    return {"status": "accepted"}


# ---------------------------------------------------------------------------
# Meta WhatsApp Cloud API webhook (verification + inbound)
# ---------------------------------------------------------------------------

@app.get("/webhook/whatsapp")
async def whatsapp_verify(
    hub_mode: str = Query(default="", alias="hub.mode"),
    hub_challenge: str = Query(default="", alias="hub.challenge"),
    hub_verify_token: str = Query(default="", alias="hub.verify_token"),
):
    expected = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    if hub_mode == "subscribe" and hub_verify_token == expected:
        return PlainTextResponse(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook/whatsapp")
async def whatsapp_inbound(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    try:
        entry       = body["entry"][0]
        change      = entry["changes"][0]["value"]
        message     = change["messages"][0]
        msg_type    = message.get("type")
        payment_id  = message.get("context", {}).get("id", message["id"])
        from_number = message["from"]
        if msg_type == "interactive":
            reply_id   = message["interactive"]["button_reply"]["id"]
            transcript = "pay" if "pay" in reply_id else "delay"
        elif msg_type == "text":
            transcript = message["text"]["body"]
        else:
            return {"status": "ignored"}
        language = change.get("metadata", {}).get("display_phone_number_language", "en")
        fake_payload = RazorpayWebhookPayload(
            event="payment.failed",
            payment_id=payment_id,
            amount=0,
            channel="WHATSAPP",
            language=language if language in ("en", "hi", "hr") else "en",
            notes={"transcript": transcript, "customer_phone": from_number},
        )
        background_tasks.add_task(process_event, fake_payload)
    except (KeyError, IndexError) as exc:
        logger.warning("Malformed WhatsApp payload: %s", exc)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Twilio WhatsApp routes
# ---------------------------------------------------------------------------

@app.post("/twilio/whatsapp/send")
async def twilio_whatsapp_send(payload: WhatsAppSendRequest):
    result = await whatsapp_client.send_payment_link(
        payload.to, payload.amount, payload.customer_name, payload.payment_link
    )
    return {"status": "sent", "to": payload.to, "sid": result}


@app.post("/twilio/whatsapp/incoming")
async def twilio_whatsapp_incoming(request: Request, background_tasks: BackgroundTasks):
    # Twilio sends form-encoded data
    form        = await request.form()
    text        = (form.get("Body") or "").strip()
    from_raw    = (form.get("From") or "").strip()
    from_number = normalize_phone(from_raw)

    if not text or not from_number:
        return {"status": "ignored"}

    logger.info("Twilio inbound from=%s body=%s", from_number, text)

    reply = TwilioClient.bot_reply(text)
    background_tasks.add_task(_send_twilio_reply, f"+{from_number}", reply)

    fake_payload = RazorpayWebhookPayload(
        event="payment.failed",
        payment_id=f"wa_{from_number}_{int(__import__('time').time())}",
        amount=0,
        channel="WHATSAPP",
        language="en",
        notes={"transcript": text, "customer_phone": from_number},
    )
    background_tasks.add_task(process_event, fake_payload)
    return {"status": "ok"}


async def _send_twilio_reply(phone: str, message: str):
    try:
        whatsapp_client.send_message(f"whatsapp:{phone}", message)
    except Exception as exc:
        logger.error("Twilio reply failed: %s", exc)


# ---------------------------------------------------------------------------
# Vapi voice routes
# ---------------------------------------------------------------------------

@app.post("/vapi/webhook")
async def vapi_webhook(request: Request, background_tasks: BackgroundTasks):
    body     = await request.json()
    msg_type = body.get("message", {}).get("type", "")
    if msg_type == "end-of-call-report":
        call            = body["message"]
        call_id         = call.get("call", {}).get("id", "unknown")
        transcript      = call.get("transcript", "")
        customer_number = call.get("call", {}).get("customer", {}).get("number", "")
        logger.info("Vapi call ended id=%s transcript=%s", call_id, transcript[:80])
        fake_payload = RazorpayWebhookPayload(
            event="payment.failed",
            payment_id=call_id,
            amount=0,
            channel="VOICE",
            language="en",
            notes={"transcript": transcript, "customer_phone": customer_number},
        )
        background_tasks.add_task(process_event, fake_payload)
    return {"status": "ok"}


@app.post("/vapi/call/start")
async def vapi_call_start(payload: VoiceCallRequest):
    provider = os.getenv("VOICE_PROVIDER", "vapi").lower()
    mock     = os.getenv("MOCK_MODE", "false").lower() == "true"
    vapi_ok  = bool(os.getenv("VAPI_API_KEY")) and bool(os.getenv("VAPI_PHONE_NUMBER_ID"))

    if mock or (provider == "vapi" and not vapi_ok):
        raise HTTPException(
            status_code=501,
            detail="Voice calls not configured – set VAPI_API_KEY and VAPI_PHONE_NUMBER_ID",
        )
    try:
        call = await voice_service.start_call(payload.to, payload.amount)
    except httpx.HTTPStatusError as exc:
        detail = "Call request rejected"
        try:
            err_json = exc.response.json()
            if isinstance(err_json, dict):
                detail = (
                    err_json.get("message")
                    or (err_json.get("RestException") or {}).get("Message")
                    or detail
                )
        except Exception:
            detail = exc.response.text or detail
        raise HTTPException(status_code=502, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"status": "queued", "id": call.get("id") or call.get("CallSid"), "to": payload.to}


# ---------------------------------------------------------------------------
# Exotel / Twilio voice status callbacks
# ---------------------------------------------------------------------------

@app.post("/api/voice/exotel/status")
async def exotel_status(request: Request, background_tasks: BackgroundTasks):
    payload  = await request.json()
    call_sid = payload.get("CallSid") or payload.get("call_sid")
    status   = payload.get("Status") or payload.get("status")
    logger.info("Exotel status callback call_sid=%s status=%s", call_sid, status)
    fake_payload = RazorpayWebhookPayload(
        event="payment.failed",
        payment_id=call_sid or "unknown",
        amount=0,
        channel="VOICE",
        language="en",
        notes={"exotel_status": status},
    )
    background_tasks.add_task(process_event, fake_payload)
    return {"status": "ok"}


@app.post("/twilio/voice/status")
async def twilio_voice_status(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info("Twilio voice status callback: %s", payload)
    fake_payload = RazorpayWebhookPayload(
        event="payment.failed",
        payment_id=payload.get("CallSid", "unknown"),
        amount=0,
        channel="VOICE",
        language="en",
        notes={"twilio_status": payload.get("CallStatus", "")},
    )
    background_tasks.add_task(process_event, fake_payload)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Audit trail
# ---------------------------------------------------------------------------

@app.get("/audit")
async def get_audit(limit: int = Query(default=100, le=500)):
    db_pool = get_db()
    cols = ["timestamp", "transaction_id", "amount", "channel", "language",
            "intent", "confidence_score", "razorpay_api_status", "system_state"]
    with db_pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT timestamp, transaction_id, amount, channel, language,
                       intent, confidence_score, razorpay_api_status, system_state
                FROM audit_trail
                ORDER BY timestamp DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    entries = []
    for row in rows:
        entry = dict(zip(cols, row))
        ts = entry["timestamp"]
        entry["timestamp"] = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        entries.append(entry)
    return {"entries": entries}


# ---------------------------------------------------------------------------
# Core processing pipeline
# ---------------------------------------------------------------------------

async def process_event(payload: RazorpayWebhookPayload):
    redis = await get_redis()

    lock_key = f"webhook_lock:{payload.payment_id}"
    acquired = await redis.setnx(lock_key, "1")
    if not acquired:
        logger.info("Duplicate webhook ignored for %s", payload.payment_id)
        return
    await redis.expire(lock_key, 30)

    result = await fsm_engine.handle_event(payload, redis=redis)

    now     = datetime.now(timezone.utc)
    db_pool = get_db()
    with db_pool.connection() as conn:
        conn.execute(
            """
            INSERT INTO audit_trail (
                timestamp, transaction_id, amount, channel, language,
                intent, confidence_score, razorpay_api_status, system_state
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                now,
                payload.payment_id,
                payload.amount,
                payload.channel,
                payload.language,
                result.intent,
                result.confidence,
                result.api_status,
                result.new_state.name,
            ),
        )

    await broadcast_audit({
        "timestamp":           now.strftime("%H:%M:%S"),
        "transaction_id":      payload.payment_id,
        "amount":              payload.amount,
        "channel":             payload.channel,
        "language":            payload.language,
        "intent":              result.intent,
        "confidence_score":    result.confidence,
        "razorpay_api_status": result.api_status,
        "system_state":        result.new_state.name,
    })


async def broadcast_audit(message: dict):
    dead = []
    for ws in connected_ws:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_ws.remove(ws)


# ---------------------------------------------------------------------------
# WebSocket — live audit stream
# ---------------------------------------------------------------------------

@app.websocket("/ws/audit")
async def audit_ws(websocket: WebSocket):
    await websocket.accept()
    connected_ws.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WebSocket error: %s", e)
    finally:
        if websocket in connected_ws:
            connected_ws.remove(websocket)
