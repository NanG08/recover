import enum
from pydantic import BaseModel, Field
from typing import Literal, Optional


class SystemState(enum.Enum):
    INITIATED             = "INITIATED"
    VOICE_OUTBOUND_QUEUED = "VOICE_OUTBOUND_QUEUED"
    IN_CALL               = "IN_CALL"
    WHATSAPP_LINK_SENT    = "WHATSAPP_LINK_SENT"
    PROMISE_TO_PAY        = "PROMISE_TO_PAY"
    PAYMENT_RESOLVED      = "PAYMENT_RESOLVED"
    ESCALATED_DISPUTE     = "ESCALATED_DISPUTE"


class RazorpayWebhookPayload(BaseModel):
    event: Literal['payment.failed', 'subscription.halted', 'invoice.overdue']
    payment_id: str = Field(..., alias='payment_id')
    amount: int = Field(..., description='Amount in paise')
    currency: str = Field(default='INR')
    # Uppercase to match frontend + FSM usage
    channel: Literal['VOICE', 'WHATSAPP']
    language: Literal['en', 'hi', 'hr']
    notes: Optional[dict] = None
    raw: Optional[dict] = None

    model_config = {"populate_by_name": True}


class FSMResult(BaseModel):
    intent: str
    confidence: float
    api_status: str
    new_state: SystemState
