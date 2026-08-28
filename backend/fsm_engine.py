import enum
import logging
from typing import Any

from .models import FSMResult
from .intent_nlu import IntentRecognizer
from .whatsapp_service import WhatsAppClient
from .voice_service import VoiceService

logger = logging.getLogger(__name__)

class SystemState(enum.Enum):
    INITIATED = "INITIATED"
    VOICE_OUTBOUND_QUEUED = "VOICE_OUTBOUND_QUEUED"
    IN_CALL = "IN_CALL"
    WHATSAPP_LINK_SENT = "WHATSAPP_LINK_SENT"
    PROMISE_TO_PAY = "PROMISE_TO_PAY"
    PAYMENT_RESOLVED = "PAYMENT_RESOLVED"
    ESCALATED_DISPUTE = "ESCALATED_DISPUTE"

# Simple transition matrix (state, intent) -> new_state
_TRANSITIONS = {
    (SystemState.INITIATED, "AGREE_TO_PAY"): SystemState.PAYMENT_RESOLVED,
    (SystemState.INITIATED, "ASK_DELAY"): SystemState.PROMISE_TO_PAY,
    (SystemState.INITIATED, "DISPUTE_CHARGE"): SystemState.ESCALATED_DISPUTE,
    (SystemState.PROMISE_TO_PAY, "AGREE_TO_PAY"): SystemState.PAYMENT_RESOLVED,
    (SystemState.PROMISE_TO_PAY, "DISPUTE_CHARGE"): SystemState.ESCALATED_DISPUTE,
    # ... add more as needed
}

class FSMEngine:
    def __init__(self, intent_recognizer: IntentRecognizer, whatsapp_client: WhatsAppClient, voice_service: VoiceService):
        self.intent_recognizer = intent_recognizer
        self.whatsapp = whatsapp_client
        self.voice = voice_service
        self.retry_counts = {}
        self.max_retries = 2

    async def handle_event(self, payload: Any) -> FSMResult:
        """Process a webhook payload through the FSM.
        Returns an FSMResult containing intent, confidence, API status, and new state.
        """
        # Determine language text (for demo we just use payload.notes.get('transcript') or empty)
        transcript = payload.notes.get('transcript') if payload.notes else ""
        intent, confidence = self.intent_recognizer.recognize(transcript, payload.language)
        logger.info("Recognized intent %s with confidence %.2f", intent, confidence)

        # Determine next state based on current state (simplified: always start from INITIATED)
        current_state = SystemState.INITIATED
        new_state = _TRANSITIONS.get((current_state, intent), SystemState.ESCALATED_DISPUTE)
        logger.info("FSM transition %s -> %s on intent %s", current_state.name, new_state.name, intent)

        # Execute side‑effects based on new state
        api_status = "none"
        if new_state == SystemState.WHATSAPP_LINK_SENT:
            await self.whatsapp.send_payment_link(payload.payment_id, payload.amount)
            api_status = "whatsapp_sent"
        elif new_state == SystemState.PAYMENT_RESOLVED:
            # Placeholder call to Razorpay refund/collect API (mock)
            api_status = "payment_resolved"
        elif new_state == SystemState.ESCALATED_DISPUTE:
            api_status = "escalated"

        # Return result for audit trail
        return FSMResult(
            intent=intent,
            confidence=confidence,
            api_status=api_status,
            new_state=new_state,
        )
