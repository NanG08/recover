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


from .exotel_service import ExotelService
import os

class VoiceService:
    """Wrapper that selects the voice provider (Exotel or Vapi)."""

    def __init__(self):
        self.provider = os.getenv("VOICE_PROVIDER", "exotel").lower()
        if self.provider == "exotel":
            from .exotel_service import ExotelService
            self.service = ExotelService()
        elif self.provider == "twilio":
            # Twilio voice not supported; fallback to Vapi
            logger.warning("VOICE_PROVIDER set to 'twilio' but Twilio voice not implemented; using Vapi fallback.")
            self.provider = "vapi"
            self.api_key = os.getenv("VAPI_API_KEY", "")
            self.phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID", "")
            self.public_base_url = os.getenv("TWILIO_PUBLIC_BASE_URL", "").rstrip("/")
        else:
            # fallback to original Vapi implementation
            self.api_key = os.getenv("VAPI_API_KEY", "")
            self.phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID", "")
            self.public_base_url = os.getenv("TWILIO_PUBLIC_BASE_URL", "").rstrip("/")

    async def start_call(self, customer_phone: str, amount: int) -> Any:
        # Mock mode applies to both providers
        if os.getenv("MOCK_MODE", "false").lower() == "true":
            mock_id = f"mock_call_{int(__import__('time').time())}"
            logger.info("Mock call queued id=%s to=%s", mock_id, customer_phone)
            return {"id": mock_id}

        if self.provider == "exotel":
            return await self.service.start_call(customer_phone, amount)
        else:
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
                    "voice": {"provider": "playht", "voiceId": "jennifer"},
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
                if resp.is_error:
                    logger.error("Vapi rejected call request: status=%s body=%s", resp.status_code, resp.text[:1000])
                resp.raise_for_status()
                data = resp.json()
                logger.info("Vapi call created id=%s", data.get("id"))
                return data
