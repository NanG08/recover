import os
import httpx
import logging
from typing import Any

logger = logging.getLogger(__name__)

class WhatsAppClient:
    """Simple async wrapper for Meta WhatsApp Cloud API.
    Sends interactive quick‑reply button messages.
    """

    def __init__(self):
        self.token = os.getenv("WHATSAPP_TOKEN")
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        if not self.token or not self.phone_number_id:
            raise RuntimeError("WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set in environment")
        self.base_url = f"https://graph.facebook.com/v20.0/{self.phone_number_id}/messages"
        self.client = httpx.AsyncClient(timeout=10)

    async def send_payment_link(self, customer_id: str, amount: int) -> Any:
        """Send a payment link button to the customer via WhatsApp.
        Args:
            customer_id: Identifier (e.g., payment_id) used as a reference.
            amount: Amount in paise (or smallest currency unit).
        Returns:
            The JSON response from the WhatsApp API.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": customer_id,  # In real usage this would be the customer's phone number
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": f"Your payment of ₹{amount/100:.2f} is pending. Please pay now."},
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {
                                "id": f"pay_{customer_id}",
                                "title": "Pay via UPI"
                            }
                        },
                        {
                            "type": "reply",
                            "reply": {
                                "id": f"delay_{customer_id}",
                                "title": "Kal Doonga / Need Time"
                            }
                        }
                    ]
                }
            }
        }
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        try:
            response = await self.client.post(self.base_url, json=payload, headers=headers)
            response.raise_for_status()
            logger.info("WhatsApp payment link sent for %s", customer_id)
            return response.json()
        except httpx.HTTPError as exc:
            logger.error("Failed to send WhatsApp message: %s", exc)
            raise
