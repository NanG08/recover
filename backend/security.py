import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)


def verify_signature(payload_body: bytes, header_signature: str, secret: str) -> bool:
    """Verify Razorpay webhook HMAC-SHA256 signature."""
    if not payload_body or not header_signature or not secret:
        logger.warning("Missing data for signature verification")
        return False
    computed = hmac.HMAC(
        key=secret.encode(),
        msg=payload_body,
        digestmod=hashlib.sha256,
    ).hexdigest()
    is_valid = hmac.compare_digest(computed, header_signature)
    if not is_valid:
        logger.warning("Invalid webhook signature")
    return is_valid
