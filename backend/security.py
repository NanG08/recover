import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)

def verify_signature(payload_body: bytes, header_signature: str, secret: str) -> bool:
    """Verify Razorpay webhook HMAC‑SHA256 signature.

    Razorpay provides the signature in the `x-razorpay-signature` header.
    The verification is:
        expected = hmac_sha256(secret, request_body)
    and compare the hex digest with the header value.
    """
    if not payload_body or not header_signature or not secret:
        logger.warning("Missing data for signature verification")
        return False
    computed = hmac.new(key=secret.encode(), msg=payload_body, digestmod=hashlib.sha256).hexdigest()
    # Use constant‑time comparison to avoid timing attacks
    is_valid = hmac.compare_digest(computed, header_signature)
    if not is_valid:
        logger.warning("Invalid webhook signature. Expected %s, got %s", computed, header_signature)
    return is_valid
