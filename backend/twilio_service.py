import os
import logging
from typing import Any
from twilio.rest import Client

logger = logging.getLogger(__name__)

class TwilioService:
    """Simple wrapper for Twilio voice calls.
    Uses Twilio's Calls API to place an outbound call that reads the amount via TTS.
    """

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.voice_number = os.getenv("TWILIO_VOICE_NUMBER")
        self.status_callback = os.getenv("TWILIO_STATUS_CALLBACK_URL")
        if not all([self.account_sid, self.auth_token, self.voice_number, self.status_callback]):
            logger.warning("Twilio voice environment variables are incomplete; TwilioService may fail.")
        self.client = Client(self.account_sid, self.auth_token) if self.account_sid and self.auth_token else None

    async def start_call(self, customer_phone: str, amount: int) -> Any:
        """Place a call to ``customer_phone``.
        ``customer_phone`` should be in E.164 format (e.g., +1234567890).
        ``amount`` is in paise; we will speak rupees.
        """
        if not self.client:
            raise RuntimeError("Twilio client not configured")
        # Build a simple TwiML that says the amount and hangs up.
        rupees = amount / 100 if amount > 0 else 0
        message = f"Hi, this is Recover calling about a pending payment of rupees {rupees:.0f}. Please settle it at your earliest convenience."
        twiml = f"<?xml version='1.0' encoding='UTF-8'?><Response><Say>{message}</Say></Response>"
        try:
            call = self.client.calls.create(
                to=customer_phone,
                from_=self.voice_number,
                twiml=twiml,
                status_callback=self.status_callback,
                status_callback_method="POST",
            )
            logger.info("Twilio call created id=%s to=%s", call.sid, customer_phone)
            return {"id": call.sid}
        except Exception as exc:
            logger.error("Twilio call failed: %s", exc)
            raise
