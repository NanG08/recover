from pydantic import BaseModel, Field
from typing import Literal, Optional

class RazorpayWebhookPayload(BaseModel):
    """Schema for Razorpay webhook events we care about.
    Only the fields needed for the engine are captured.
    """
    event: Literal['payment.failed', 'subscription.halted', 'invoice.overdue']
    payment_id: str = Field(..., alias='payment_id')
    amount: int = Field(..., description='Amount in the smallest currency unit (e.g., paise)')
    currency: str = Field(default='INR')
    channel: Literal['voice', 'whatsapp']
    language: Literal['en', 'hi', 'hr']  # en=English, hi=Hindi, hr=Haryanvi
    # Additional optional fields we may receive
    notes: Optional[dict] = None
    # Raw payload is kept for debugging
    raw: Optional[dict] = None

class FSMResult(BaseModel):
    intent: str
    confidence: float
    api_status: str
    new_state: 'SystemState'

# Forward reference for SystemState enum defined later
