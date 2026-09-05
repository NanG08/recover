import os
import logging
import httpx
from fastapi import Request, BackgroundTasks, HTTPException
from .models import RazorpayWebhookPayload
from .utils import (
    get_redis,
    mock_public_url,
    normalize_whatsapp_number,
    whatsapp_number_is_allowed,
    WHATSAPP_AUTOREPLY_ENABLED,
    WHATSAPP_END_COMMANDS,
    WHATSAPP_CLOSE_AFTER,
    WHATSAPP_SESSION_TTL,
    WHATSAPP_CLOSED_TTL,
)
from .main import app, logger, process_event, _trigger_callback

# Legacy Ultramsg WhatsApp routes (kept for reference, not active)

@app.post("/ultramsg/incoming")
async def ultramsg_incoming(request: Request, background_tasks: BackgroundTasks):
    if not WHATSAPP_AUTOREPLY_ENABLED:
        logger.info("Ignoring inbound WhatsApp message because auto-replies are disabled")
        return {"status": "ignored"}

    body = await request.json()
    msg = body.get("data", {})
    text = msg.get("body", "").strip()
    from_number = msg.get("from", "").replace("@c.us", "")
    msg_type = msg.get("type", "")

    if msg_type != "chat" or not text or not from_number:
        return {"status": "ignored"}

    from_number = normalize_whatsapp_number(from_number)
    if not whatsapp_number_is_allowed(from_number):
        logger.info("Ignoring WhatsApp message from non-allowed number %s", from_number)
        return {"status": "ignored"}

    redis = await get_redis()
    if not await redis.get(f"whatsapp_session:{from_number}"):
        logger.info("Ignoring WhatsApp message without active session from %s", from_number)
        return {"status": "ignored"}

    logger.info("Ultramsg inbound from=%s body=%s", from_number, text)

    normalized_text = text.lower()
    case = await redis.hgetall(f"whatsapp_case:{from_number}")
    case_id = case.get("case_id", f"case_{from_number}")
    payment_link = case.get("payment_link", f"{mock_public_url()}/mock/pay/{case_id}")
    if normalized_text in WHATSAPP_END_COMMANDS:
        background_tasks.add_task(
            _send_ultramsg_reply,
            from_number,
            "Conversation ended. You will not receive more recovery messages. Reply START if you need help again.",
        )
        await redis.delete(f"whatsapp_session:{from_number}")
        await redis.set(f"whatsapp_closed:{from_number}", "closed", ex=WHATSAPP_CLOSED_TTL)
        return {"status": "ended"}

    if normalized_text in {"pay", "yes", "1"}:
        reply = f"Here is your secure payment link: {payment_link}\nAfter paying, reply PAID to submit proof. Reply END to close this conversation."
    elif normalized_text in {"paid", "payment done", "done"}:
        reply = f"Thank you. Submit your payment proof here: {mock_public_url()}/mock/proof/{case_id}"
    elif normalized_text in {"delay", "later", "time", "2"}:
        reply = "When should I remind you? Reply 3 DAYS, 5 DAYS, or 7 DAYS. Reply END to close this conversation."
    elif normalized_text in {"3 days", "5 days", "7 days"}:
        reply = f"Thanks. We will remind you in {normalized_text}. Reply END to stop future reminders."
    elif normalized_text in {"dispute", "wrong", "3"}:
        reply = f"Your dispute case has been created. Track it here: {mock_public_url()}/mock/case/{case_id}"
    else:
        reply = "[Legacy bot reply: not processed]"
    background_tasks.add_task(_send_ultramsg_reply, from_number, reply)

    if normalized_text in WHATSAPP_CLOSE_AFTER:
        await redis.delete(f"whatsapp_session:{from_number}")
        await redis.set(f"whatsapp_closed:{from_number}", "closed", ex=WHATSAPP_CLOSED_TTL)

    fake_payload = RazorpayWebhookPayload(
        event="payment.failed",
        payment_id=f"wa_{from_number}_{int(__import__('time').time())}",
        amount=0,
        channel="WHATSAPP",
        language="en",
        notes={"transcript": text, "customer_phone": from_number, "inbound": True},
    )
    background_tasks.add_task(process_event, fake_payload)

    if text.lower() in {"call", "agent", "talk", "speak", "4"}:
        background_tasks.add_task(_trigger_callback, f"+{from_number}")

    return {"status": "ok"}

async def _send_ultramsg_reply(phone: str, message: str):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID", "")
    token = os.getenv("ULTRAMSG_TOKEN", "")
    if not instance_id or not token:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.ultramsg.com/{instance_id}/messages/chat",
                data={"token": token, "to": phone, "body": message},
            )
    except Exception as exc:
        logger.error("Ultramsg reply failed: %s", exc)
