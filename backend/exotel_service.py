import os
import logging
import httpx

logger = logging.getLogger(__name__)

class ExotelService:
    """Simple wrapper around Exotel's Calls API.
    It uses Basic Auth (Account SID + Auth Token) and sends a plain text
    message using Exotel's Text‑to‑Speech feature.
    """

    def __init__(self) -> None:
        self.account_sid = os.getenv("EXOTEL_ACCOUNT_SID")
        self.auth_token = os.getenv("EXOTEL_AUTH_TOKEN")
        self.caller_id = os.getenv("EXOTEL_CALLER_ID")
        self.status_callback = os.getenv("EXOTEL_STATUS_CALLBACK_URL")
        if not self.account_sid or not self.auth_token:
            raise RuntimeError("EXOTEL_ACCOUNT_SID and EXOTEL_AUTH_TOKEN must be set")
        if not self.caller_id:
            raise RuntimeError("EXOTEL_CALLER_ID must be set")
        if not self.status_callback:
            logger.warning("EXOTEL_STATUS_CALLBACK_URL not set – call status will not be reported")
        self.base_url = f"https://api.exotel.com/v1/Accounts/{self.account_sid}"
        self.auth = (self.account_sid, self.auth_token)

    async def start_call(self, to: str, amount: int) -> dict:
        """Initiate an outbound call via Exotel.
        Parameters
        ----------
        to: str
            Destination phone number (E.164 format, e.g. "+919876543210").
        amount: int
            Amount in paise – used only to build a spoken message.
        Returns
        -------
        dict
            JSON response from Exotel containing at least ``CallSid``.
        """
        amount_rupees = amount / 100 if amount > 0 else 0
        amount_str = f"{amount_rupees:.0f}" if amount_rupees else "pending"
        message = (
            f"Hi, this is Recover calling about a pending payment of rupees {amount_str}. "
            "Is this a good time?"
        )
        payload = {
            "From": self.caller_id,
            "To": to if to.startswith("+") else f"+{to}",
            "Text": message,
            "Language": "en",
            "StatusCallback": self.status_callback,
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(f"{self.base_url}/Calls.json", auth=self.auth, data=payload)
                resp.raise_for_status()
                data = resp.json()
                logger.info("Exotel call created id=%s", data.get("CallSid"))
                return data
        except httpx.HTTPStatusError as e:
            # Log detailed info for debugging
            logger.error(
                "Exotel call failed: status %s, response %s, payload %s",
                e.response.status_code,
                e.response.text,
                payload,
            )
            raise
        except Exception as e:
            logger.exception("Unexpected error while creating Exotel call: %s", e)
            raise
