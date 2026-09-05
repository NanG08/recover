import os
import json
from typing import Any
from twilio.rest import Client

class TwilioClient:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.whatsapp_number = os.getenv('TWILIO_WHATSAPP_FROM')
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None

    def send_message(self, to_phone: str, body: str):
        """Send a simple WhatsApp text message.
        `to_phone` should be in the format ``whatsapp:+<number>``.
        """
        if not self.client:
            print(f"[MOCK TWILIO SEND] To: {to_phone} | Body: {body}")
            return None
        try:
            message = self.client.messages.create(
                body=body,
                from_=self.whatsapp_number,
                to=to_phone,
            )
            return message.sid
        except Exception as e:
            print(f"[TWILIO ERROR] send_message failed: {e}")
            return None

    def send_interactive_message(self, to_phone: str, content_sid: str, content_variables: dict = None, fallback_text: str = None):
        """Send a template‑based (content SID) WhatsApp message.
        If `content_sid` is missing, falls back to a plain text message.
        """
        if not self.client:
            print(f"[MOCK TWILIO SEND] To: {to_phone} | Content SID: {content_sid} | Variables: {content_variables}")
            return None
        try:
            if content_sid:
                message = self.client.messages.create(
                    from_=self.whatsapp_number,
                    to=to_phone,
                    content_sid=content_sid,
                    content_variables=json.dumps(content_variables or {}),
                )
                return message.sid
            elif fallback_text:
                return self.send_message(to_phone, fallback_text)
        except Exception as e:
            print(f"[TWILIO ERROR] send_interactive_message failed: {e}")
            if fallback_text:
                return self.send_message(to_phone, fallback_text)
            return None

    async def send_payment_link(self, customer_phone: str, amount: int, customer_name: str = "Customer", payment_link: str = "") -> Any:
        """Send a payment‑link message via WhatsApp.
        Mirrors ``WhatsAppClient.send_payment_link``.
        """
        lines = [f"Hi {customer_name}, your payment of ₹{amount / 100:.0f} is pending."]
        if payment_link:
            lines.append(f"Pay now: {payment_link}")
        lines.append(
            "Reply *PAY* once done, *DELAY* if you need more time, "
            "or *DISPUTE* if something looks wrong.\n"
            "Reply *CALL* to speak with someone directly."
        )
        body = "\n\n".join(lines)
        to_formatted = f"whatsapp:{customer_phone}" if not customer_phone.startswith('whatsapp:') else customer_phone
        return self.send_message(to_formatted, body)

    @staticmethod
    def bot_reply(message: str) -> str:
        """Generate a canned reply matching the Ultramsg logic.
        This static method can be called without an instance.
        """
        normalized = message.strip().lower()
        if normalized in {"pay", "yes", "1"}:
            return "Thanks. We recorded your payment confirmation. Your recovery case is now marked for verification."
        if normalized in {"delay", "later", "time", "2"}:
            return "No problem. We recorded your request for more time. Reply PAY when you are ready to continue."
        if normalized in {"dispute", "wrong", "3"}:
            return "We understand. Your case has been flagged for a specialist review."
        if normalized in {"call", "agent", "talk", "speak", "4"}:
            public_url = os.getenv("TWILIO_PUBLIC_BASE_URL", "http://localhost:5173").rstrip("/")
            return f"Join the AI voice call here: {public_url}/call\n\nOpen the link and click START CALL — our agent will speak with you directly."
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
