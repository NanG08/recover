# Backend Deep Dive

## API Specification

| Method | Path            | Description                                         | Request Body | Response |
|--------|-----------------|-----------------------------------------------------|--------------|----------|
| GET    | `/health`       | Simple health check for load‑balancers and monitoring. | – | `{ "status": "ok" }` |
| POST   | `/webhook`      | Razorpay webhook endpoint (payment.failed, subscription.halted, invoice.overdue). Performs HMAC verification, idempotent processing, and forwards to FSM. | JSON (see `RazorpayWebhookPayload`) | `{ "status": "accepted" }` |
| WS     | `/ws/audit`     | Server‑Sent Events / WebSocket streaming of audit trail entries in real‑time. Clients receive JSON objects matching the audit table columns. |

## Webhook Signature Verification Flow
1. **Extract Raw Body** – FastAPI provides the raw request body as `bytes`.
2. **Retrieve Header** – The `x‑razorpay‑signature` header contains the HMAC signature.
3. **Compute HMAC** – `hmac.new(secret, raw_body, hashlib.sha256).hexdigest()`.
4. **Constant‑time Comparison** – `hmac.compare_digest(computed, header_signature)` to avoid timing attacks.
5. **Reject** – If verification fails, return `400 Bad Request`.

## State Transition Matrix
| Current State               | Intent          | Next State                |
|-----------------------------|-----------------|---------------------------|
| `INITIATED`                 | `AGREE_TO_PAY`  | `PAYMENT_RESOLVED`        |
| `INITIATED`                 | `ASK_DELAY`     | `PROMISE_TO_PAY`          |
| `INITIATED`                 | `DISPUTE_CHARGE`| `ESCALATED_DISPUTE`       |
| `PROMISE_TO_PAY`            | `AGREE_TO_PAY`  | `PAYMENT_RESOLVED`        |
| `PROMISE_TO_PAY`            | `DISPUTE_CHARGE`| `ESCALATED_DISPUTE`       |
| *(any other combination)*   | –               | `ESCALATED_DISPUTE`       |

### Hard‑Coded Rules & Boundaries
- **Retry Limit** – Maximum 2 retry attempts per transaction. Exceeded attempts automatically transition to `ESCAPED_DISPUTE`.
- **Anti‑Harassment** – After sending a WhatsApp button twice without a payment, the engine escalates to dispute.
- **Idempotency** – Redis lock keyed by `payment_id` with a 30 s TTL prevents duplicate processing of Razorpay's retry webhooks.

---
*Documentation will be updated as new endpoints or states are added.*
