import logging
import os
from typing import Any
import httpx

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """Ultramsg WhatsApp client — free tier, no business verification needed."""

    def __init__(self):
        self.instance_id = os.getenv("ULTRAMSG_INSTANCE_ID", "")
        self.token = os.getenv("ULTRAMSG_TOKEN", "")
        self.base_url = f"https://api.ultramsg.com/{self.instance_id}"

    async def send_payment_link(
        self,
        customer_phone: str,
        amount: int,
        customer_name: str = "Customer",
        payment_link: str = "",
    ) -> Any:
        if not self.instance_id or not self.token:
            raise RuntimeError("ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN must be set")

        # Ultramsg expects number without + or whatsapp: prefix
        phone = customer_phone.replace("whatsapp:", "").replace("+", "").strip()

        lines = [f"Hi {customer_name}, your payment of ₹{amount / 100:.0f} is pending."]
        if payment_link:
            lines.append(f"Pay now: {payment_link}")
        lines.append(
            "Reply *PAY* once done, *DELAY* if you need more time, "
            "or *DISPUTE* if something looks wrong.\n"
            "Reply *CALL* to speak with someone directly."
        )
        body = "\n\n".join(lines)

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{self.base_url}/messages/chat",
                data={"token": self.token, "to": phone, "body": body},
            )
            resp.raise_for_status()
            logger.info("Ultramsg message sent to %s", phone)
            return resp.json()

    @staticmethod
    def bot_reply(message: str) -> str:
        normalized = message.strip().lower()
        if normalized in {"pay", "yes", "1"}:
            return "Thanks. We recorded your payment confirmation. Your recovery case is now marked for verification."
        if normalized in {"delay", "later", "time", "2"}:
            return "No problem. We recorded your request for more time. Reply PAY when you are ready to continue."
        if normalized in {"dispute", "wrong", "3"}:
            return "We understand. Your case has been flagged for a specialist review."
        if normalized in {"call", "agent", "talk", "speak", "4"}:
            return "Got it. We will call you on this number shortly. Please keep your phone available."
        if normalized in {"end", "stop", "quit", "exit", "unsubscribe", "cancel"}:
            return "Conversation ended. You will not receive more recovery messages. Reply START if you need help again."
        if normalized in {"hello", "hi", "hey", "start", "menu"}:
            return (
                "Hi, this is Recover. I can help resolve a pending payment.\n\n"
                "Reply:\n"
                "*PAY* — to confirm payment\n"
                "*DELAY* — if you need more time\n"
                "*DISPUTE* — if something looks wrong\n"
                "*CALL* — to speak with someone directly\n"
                "*END* — to end this conversation"
            )
        return "Reply *PAY*, *DELAY*, *DISPUTE*, or *CALL* to speak with someone."
