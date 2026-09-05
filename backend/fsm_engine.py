import logging
import os
from typing import Any

import httpx

from .models import FSMResult, SystemState
from .intent_nlu import IntentRecognizer
from .whatsapp_service import WhatsAppClient
from .voice_service import VoiceService

logger = logging.getLogger(__name__)

MAX_RETRIES = 2

# Transition matrix: (current_state, intent) -> new_state
_TRANSITIONS = {
    (SystemState.INITIATED,          "AGREE_TO_PAY"):   SystemState.PAYMENT_RESOLVED,
    (SystemState.INITIATED,          "ASK_DELAY"):      SystemState.PROMISE_TO_PAY,
    (SystemState.INITIATED,          "DISPUTE_CHARGE"): SystemState.ESCALATED_DISPUTE,
    (SystemState.PROMISE_TO_PAY,     "AGREE_TO_PAY"):   SystemState.PAYMENT_RESOLVED,
    (SystemState.PROMISE_TO_PAY,     "DISPUTE_CHARGE"): SystemState.ESCALATED_DISPUTE,
    (SystemState.WHATSAPP_LINK_SENT, "AGREE_TO_PAY"):   SystemState.PAYMENT_RESOLVED,
    (SystemState.WHATSAPP_LINK_SENT, "ASK_DELAY"):      SystemState.PROMISE_TO_PAY,
    (SystemState.IN_CALL,            "AGREE_TO_PAY"):   SystemState.PAYMENT_RESOLVED,
    (SystemState.IN_CALL,            "ASK_DELAY"):      SystemState.PROMISE_TO_PAY,
    (SystemState.IN_CALL,            "DISPUTE_CHARGE"): SystemState.ESCALATED_DISPUTE,
}

_RAZORPAY_BASE = "https://api.razorpay.com/v1"


class FSMEngine:
    def __init__(
        self,
        intent_recognizer: IntentRecognizer,
        whatsapp_client: WhatsAppClient,
        voice_service: VoiceService,
    ):
        self.intent_recognizer = intent_recognizer
        self.whatsapp = whatsapp_client
        self.voice = voice_service

    async def _get_state(self, redis: Any, payment_id: str) -> SystemState:
        raw = await redis.get(f"fsm_state:{payment_id}")
        if raw:
            try:
                return SystemState(raw)
            except ValueError:
                pass
        return SystemState.INITIATED

    async def _set_state(self, redis: Any, payment_id: str, state: SystemState) -> None:
        await redis.set(f"fsm_state:{payment_id}", state.value, ex=86400)

    async def _get_amount(self, redis: Any, payment_id: str) -> int:
        raw = await redis.get(f"fsm_amount:{payment_id}")
        return int(raw) if raw else 0

    async def _set_amount(self, redis: Any, payment_id: str, amount: int) -> None:
        """Persist amount only if non-zero (don't overwrite with 0 from inbound replies)."""
        if amount > 0:
            await redis.set(f"fsm_amount:{payment_id}", amount, ex=86400)

    async def _get_retry_count(self, redis: Any, payment_id: str) -> int:
        raw = await redis.get(f"fsm_retries:{payment_id}")
        return int(raw) if raw else 0

    async def _increment_retry(self, redis: Any, payment_id: str) -> int:
        count = await redis.incr(f"fsm_retries:{payment_id}")
        await redis.expire(f"fsm_retries:{payment_id}", 86400)
        return count

    async def _create_razorpay_payment_link(self, payment_id: str, amount: int) -> str:
        key_id = os.getenv("RAZORPAY_KEY_ID")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        if not key_id or not key_secret:
            logger.warning("Razorpay credentials not set; skipping payment link creation")
            return ""
        if amount <= 0:
            logger.warning("Skipping payment link — amount is %d for %s", amount, payment_id)
            return ""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{_RAZORPAY_BASE}/payment_links",
                auth=(key_id, key_secret),
                json={
                    "amount": amount,
                    "currency": "INR",
                    "description": f"Recovery for payment {payment_id}",
                    "reference_id": payment_id,
                    "notify": {"sms": False, "email": False},
                    "reminder_enable": False,
                },
            )
            resp.raise_for_status()
            return resp.json().get("short_url", "")

    async def handle_event(self, payload: Any, redis: Any = None) -> FSMResult:
        transcript = (payload.notes or {}).get("transcript", "")
        intent, confidence = self.intent_recognizer.recognize(transcript, payload.language)
        logger.info("Recognized intent=%s confidence=%.2f", intent, confidence)

        current_state = SystemState.INITIATED
        if redis:
            current_state = await self._get_state(redis, payload.payment_id)

            # Persist amount if this event carries a real one
            await self._set_amount(redis, payload.payment_id, payload.amount)

            # Enforce retry limit — escalate if exceeded
            retry_count = await self._get_retry_count(redis, payload.payment_id)
            if retry_count >= MAX_RETRIES and current_state not in (
                SystemState.PAYMENT_RESOLVED,
                SystemState.ESCALATED_DISPUTE,
            ):
                logger.warning(
                    "Retry limit (%d) reached for %s — escalating", MAX_RETRIES, payload.payment_id
                )
                await self._set_state(redis, payload.payment_id, SystemState.ESCALATED_DISPUTE)
                return FSMResult(
                    intent=intent,
                    confidence=confidence,
                    api_status="escalated_retry_limit",
                    new_state=SystemState.ESCALATED_DISPUTE,
                )
            await self._increment_retry(redis, payload.payment_id)

        new_state = _TRANSITIONS.get((current_state, intent), SystemState.ESCALATED_DISPUTE)
        logger.info("FSM %s -[%s]-> %s", current_state.name, intent, new_state.name)

        if redis:
            await self._set_state(redis, payload.payment_id, new_state)

        # Resolve real amount — prefer payload, fall back to Redis-persisted value
        amount = payload.amount
        if amount <= 0 and redis:
            amount = await self._get_amount(redis, payload.payment_id)

        api_status = "none"
        customer_phone = (payload.notes or {}).get("customer_phone", "")
        customer_name = (payload.notes or {}).get("customer_name", "Customer")
        payment_link = (payload.notes or {}).get("payment_link", "")
        is_inbound = bool((payload.notes or {}).get("inbound"))

        if new_state == SystemState.PAYMENT_RESOLVED:
            link = await self._create_razorpay_payment_link(payload.payment_id, amount)
            api_status = f"payment_link_created:{link}" if link else "payment_resolved_mock"

        elif payload.channel == "WHATSAPP" and customer_phone and not is_inbound:
            await self.whatsapp.send_payment_link(customer_phone, amount, customer_name, payment_link)
            api_status = "whatsapp_sent"
            if redis:
                await self._set_state(redis, payload.payment_id, SystemState.WHATSAPP_LINK_SENT)
                session_phone = (
                    customer_phone.lower()
                    .replace("whatsapp:", "")
                    .replace("@c.us", "")
                    .replace("+", "")
                    .replace(" ", "")
                    .strip()
                )
                await redis.set(f"whatsapp_session:{session_phone}", "active", ex=86400)
            new_state = SystemState.WHATSAPP_LINK_SENT

        elif payload.channel == "VOICE" and customer_phone:
            await self.voice.start_call(customer_phone, amount)
            api_status = "voice_call_started"
            if redis:
                await self._set_state(redis, payload.payment_id, SystemState.VOICE_OUTBOUND_QUEUED)
            new_state = SystemState.VOICE_OUTBOUND_QUEUED

        elif new_state == SystemState.ESCALATED_DISPUTE:
            api_status = "escalated"

        return FSMResult(
            intent=intent,
            confidence=confidence,
            api_status=api_status,
            new_state=new_state,
        )
