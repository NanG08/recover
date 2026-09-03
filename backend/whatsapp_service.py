import logging
import json
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

class WhatsAppClient:
    """Twilio WhatsApp Sandbox/API client."""

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
        self.content_sid = os.getenv("TWILIO_WHATSAPP_CONTENT_SID", "")
        self.status_callback = os.getenv("TWILIO_WHATSAPP_STATUS_URL", "")
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"

    async def send_payment_link(
        self,
        customer_phone: str,
        amount: int,
        customer_name: str = "Customer",
        payment_link: str = "",
    ) -> Any:
        """Send a payment link button to the customer via WhatsApp.
        Args:
            customer_id: Identifier (e.g., payment_id) used as a reference.
            amount: Amount in paise (or smallest currency unit).
        Returns:
            The JSON response from the WhatsApp API.
        """
        payload = {
            "From": self.from_number,
            "To": customer_phone if customer_phone.startswith("whatsapp:") else f"whatsapp:{customer_phone}",
        }
        if self.content_sid:
            payload["ContentSid"] = self.content_sid
            variables = {"1": customer_name, "2": "₹%.2f" % (amount / 100)}
            if payment_link:
                variables["3"] = payment_link
            payload["ContentVariables"] = json.dumps(variables, ensure_ascii=False)
        else:
            lines = [f"Hi {customer_name}, your payment of ₹{amount / 100:.0f} is pending."]
            if payment_link:
                lines.append(f"Pay now: {payment_link}")
            lines.append("Reply *PAY* once done, *DELAY* if you need more time, or *DISPUTE* if something looks wrong.")
            payload["Body"] = "\n\n".join(lines)
        if self.status_callback:
            payload["StatusCallback"] = self.status_callback
        if not self.account_sid or not self.auth_token:
            raise RuntimeError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set")
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(self.base_url, data=payload, auth=(self.account_sid, self.auth_token))
            response.raise_for_status()
            logger.info("Twilio WhatsApp message sent to %s", payload["To"])
            return response.json()

    @staticmethod
    def bot_reply(message: str) -> str:
        """Return a Recover-specific reply for an inbound WhatsApp message."""
        normalized = message.strip().lower()
        if normalized in {"pay", "yes", "1"}:
            return "Thanks. We recorded your payment confirmation. Your recovery case is now marked for verification."
        if normalized in {"delay", "later", "time", "2"}:
            return "No problem. We recorded your request for more time. Reply PAY when you are ready to continue."
        if normalized in {"dispute", "wrong", "3"}:
            return "We understand. Your case has been flagged for a specialist review."
        if normalized in {"call", "agent", "talk", "speak", "4"}:
            return "Got it. We will call you on this number shortly. Please keep your phone available."
        if normalized in {"hello", "hi", "hey", "start", "menu"}:
            return (
                "Hi, this is Recover. I can help resolve a pending payment.\n\n"
                "Reply:\n"
                "*PAY* — to confirm payment\n"
                "*DELAY* — if you need more time\n"
                "*DISPUTE* — if something looks wrong\n"
                "*CALL* — to speak with someone directly"
            )
        return (
            "I can help with your pending payment.\n\n"
            "Reply *PAY*, *DELAY*, *DISPUTE*, or *CALL* to speak with someone."
        )
