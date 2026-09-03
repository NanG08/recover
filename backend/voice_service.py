import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

VAPI_BASE = "https://api.vapi.ai"

AGENT_PROMPT = """You are a polite payment recovery agent for Recover, a financial services platform.

The customer has a pending payment of ₹{amount}. Your goal is to resolve it in one short call.

Start with: "Hi, this is Recover calling about a pending payment of ₹{amount}. Can we sort this out quickly?"

Then listen. Based on their response:
- If they agree to pay → confirm and say a payment link will be sent to their WhatsApp
- If they need more time → ask how many days, acknowledge, and say you will follow up
- If they dispute the charge → apologize, say a specialist will review and contact them

Keep the conversation under 2 minutes. Be friendly, not pushy. Speak in the customer's language if they switch to Hindi."""


class VoiceService:
    """Vapi.ai voice agent client for outbound recovery calls."""

    def __init__(self):
        self.api_key = os.getenv("VAPI_API_KEY", "")
        self.phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID", "")
        self.public_base_url = os.getenv("TWILIO_PUBLIC_BASE_URL", "").rstrip("/")

    async def start_call(self, customer_phone: str, amount: int) -> Any:
        if not self.api_key:
            raise RuntimeError("VAPI_API_KEY must be set")
        if not self.phone_number_id:
            raise RuntimeError("VAPI_PHONE_NUMBER_ID must be set")

        amount_rupees = amount / 100 if amount > 0 else 0
        prompt = AGENT_PROMPT.format(amount=f"{amount_rupees:.0f}" if amount_rupees else "pending")

        payload = {
            "phoneNumberId": self.phone_number_id,
            "customer": {"number": customer_phone},
            "assistant": {
                "model": {
                    "provider": "groq",
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "system", "content": prompt}],
                },
                "voice": {
                    "provider": "playht",
                    "voiceId": "jennifer",
                },
                "firstMessage": f"Hi, this is Recover calling about a pending payment. Is this a good time?",
                "endCallMessage": "Thank you. Have a good day.",
                "maxDurationSeconds": 180,
            },
        }

        if self.public_base_url:
            payload["assistant"]["serverUrl"] = f"{self.public_base_url}/vapi/webhook"

        logger.info("Starting Vapi call to %s for ₹%s", customer_phone, amount_rupees)

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{VAPI_BASE}/call/phone",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("Vapi call created id=%s", data.get("id"))
            return data
