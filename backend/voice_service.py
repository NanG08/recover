import asyncio
import logging

logger = logging.getLogger(__name__)

class VoiceService:
    """Mock async voice call service.
    In a real implementation this would integrate with a telephony provider (e.g., Twilio).
    For the prototype we simulate call lifecycle events with asyncio sleeps.
    """

    async def start_call(self, customer_id: str, amount: int) -> None:
        """Simulate outbound call to the customer.
        Emits log statements representing state changes.
        """
        logger.info("Starting outbound call to %s for amount ₹%s", customer_id, amount / 100)
        await asyncio.sleep(0.5)  # simulate dialing
        logger.info("Call answered by %s", customer_id)
        await asyncio.sleep(1)  # simulate conversation duration
        logger.info("Call completed for %s", customer_id)
        # In a real system we would raise events that FSM could react to.
