import os
import logging
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .security import verify_signature
from .fsm_engine import FSMEngine, SystemState
from .intent_nlu import IntentRecognizer
from .whatsapp_service import WhatsAppClient
from .voice_service import VoiceService
from .models import RazorpayWebhookPayload
from .utils import get_redis, get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

app = FastAPI(title="Razorpay Revenue Recovery Engine")

# Allow the frontend to call the API (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global objects (singletons per process)
intent_recognizer = IntentRecognizer()
whatsapp_client = WhatsAppClient()
voice_service = VoiceService()
fsm_engine = FSMEngine(intent_recognizer, whatsapp_client, voice_service)

# In‑memory list of connected websockets for audit trail broadcasting
connected_ws: list[WebSocket] = []

@app.on_event("startup")
async def startup_event():
    # Initialise Redis and DB pools
    await get_redis()
    await get_db()
    logger.info("Startup: Redis and PostgreSQL connections established")

@app.on_event("shutdown")
async def shutdown_event():
    # Close connections gracefully
    redis = await get_redis()
    await redis.close()
    db = await get_db()
    await db.close()
    logger.info("Shutdown: Connections closed")

@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "ok"})

@app.post("/demo")
async def demo_webhook(background_tasks: BackgroundTasks):
    """Generate a fake Razorpay webhook payload and feed it through the
    existing processing pipeline. This allows the UI to receive demo data
    via the same WebSocket broadcast used for real events.
    """
    import random, uuid
    # Build a minimal payload – fields required by RazorpayWebhookPayload
    fake_payload = RazorpayWebhookPayload(
        payment_id=f"demo_{uuid.uuid4().hex[:8]}",
        amount=random.randint(1000, 50000),
        channel=random.choice(["WHATSAPP", "VOICE"]),
        language=random.choice(["English", "Hindi", "Haryanvi"]),
        # Add any additional required fields with placeholder values
        # (Assuming the model has default values for optional fields)
    )
    # Run the same async processing as a real webhook
    background_tasks.add_task(process_event, fake_payload)
    return {"status": "demo_sent"}

async def process_event(payload: RazorpayWebhookPayload):
    """Core processing: deduplication, FSM transition, persistence, and UI broadcast."""
    redis = await get_redis()
    # Idempotent lock: use payment_id as key
    lock_key = f"webhook_lock:{payload.payment_id}"
    # SETNX with short TTL (30 sec) to avoid race conditions
    acquired = await redis.setnx(lock_key, "1")
    if not acquired:
        logger.info(f"Duplicate webhook ignored for payment_id={payload.payment_id}")
        return
    await redis.expire(lock_key, 30)

    # Run through the finite state machine
    result = await fsm_engine.handle_event(payload)

    # Persist audit trail entry to PostgreSQL
    db = await get_db()
    async with db.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO audit_trail (
                timestamp, transaction_id, amount, channel, language, intent,
                confidence_score, razorpay_api_status, system_state
            ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8)
            """,
            payload.payment_id,
            payload.amount,
            payload.channel,
            payload.language,
            result.intent,
            result.confidence,
            result.api_status,
            result.new_state.name,
        )
    # Broadcast to connected websockets
    await broadcast_audit({
        "timestamp": "now",  # client will replace with actual value
        "transaction_id": payload.payment_id,
        "amount": payload.amount,
        "channel": payload.channel,
        "language": payload.language,
        "intent": result.intent,
        "confidence_score": result.confidence,
        "razorpay_api_status": result.api_status,
        "system_state": result.new_state.name,
    })

async def broadcast_audit(message: dict):
    dead_sockets = []
    for ws in connected_ws:
        try:
            await ws.send_json(message)
        except Exception:
            dead_sockets.append(ws)
    for ws in dead_sockets:
        connected_ws.remove(ws)

@app.websocket("/ws/audit")
async def audit_ws(websocket: WebSocket):
    await websocket.accept()
    connected_ws.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep connection alive; client may send ping
    except WebSocketDisconnect:
        connected_ws.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connected_ws.remove(websocket)
