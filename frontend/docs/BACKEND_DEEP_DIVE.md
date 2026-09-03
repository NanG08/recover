# Backend Deep Dive

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/webhook` | Razorpay webhook — HMAC verified, idempotent |
| `POST` | `/demo` | Inject synthetic event for UI testing |
| `GET` | `/audit` | Paginated audit trail from PostgreSQL |
| `WS` | `/ws/audit` | Live audit stream via WebSocket |
| `GET/POST` | `/webhook/whatsapp` | Meta WhatsApp Cloud API (hub verify + inbound) |
| `POST` | `/twilio/whatsapp/incoming` | Twilio sandbox inbound — automated bot reply |
| `POST` | `/twilio/whatsapp/send` | Send outbound WhatsApp payment reminder |
| `POST` | `/twilio/whatsapp/status` | Twilio delivery status callback |
| `POST` | `/vapi/call/start` | Trigger Vapi AI outbound voice call |
| `POST` | `/vapi/webhook` | Receive Vapi end-of-call transcript |

## Webhook Signature Verification
1. Extract raw body as `bytes`
2. Read `x-razorpay-signature` header
3. Compute `hmac.HMAC(secret, raw_body, hashlib.sha256).hexdigest()`
4. Compare with `hmac.compare_digest()` — constant-time, timing-attack safe
5. Reject with `400` if mismatch

## FSM State Transition Matrix

| Current State | Intent | Next State |
|---|---|---|
| `INITIATED` | `AGREE_TO_PAY` | `PAYMENT_RESOLVED` |
| `INITIATED` | `ASK_DELAY` | `PROMISE_TO_PAY` |
| `INITIATED` | `DISPUTE_CHARGE` | `ESCALATED_DISPUTE` |
| `PROMISE_TO_PAY` | `AGREE_TO_PAY` | `PAYMENT_RESOLVED` |
| `PROMISE_TO_PAY` | `DISPUTE_CHARGE` | `ESCALATED_DISPUTE` |
| `WHATSAPP_LINK_SENT` | `AGREE_TO_PAY` | `PAYMENT_RESOLVED` |
| `WHATSAPP_LINK_SENT` | `ASK_DELAY` | `PROMISE_TO_PAY` |
| `IN_CALL` | `AGREE_TO_PAY` | `PAYMENT_RESOLVED` |
| `IN_CALL` | `ASK_DELAY` | `PROMISE_TO_PAY` |
| `IN_CALL` | `DISPUTE_CHARGE` | `ESCALATED_DISPUTE` |
| *(retry limit exceeded)* | any | `ESCALATED_DISPUTE` |

## Redis Keys
| Key | Value | TTL |
|---|---|---|
| `webhook_lock:{payment_id}` | `"1"` | 30s — dedup lock |
| `fsm_state:{payment_id}` | `SystemState.value` | 24h |
| `fsm_amount:{payment_id}` | amount in paise | 24h |
| `fsm_retries:{payment_id}` | retry count | 24h |

## Groq NLU
- Model: `meta-llama/llama-4-maverick-17b-128e-instruct`
- System prompt classifies into exactly: `AGREE_TO_PAY` / `ASK_DELAY` / `DISPUTE_CHARGE`
- `max_tokens=10`, `temperature=0` — deterministic, fast
- Regex fallback activates on any Groq exception or missing `GROQ_API_KEY`
- Confidence: `0.97` (Groq) / `0.85` (regex match) / `0.4` (regex fallback)

## Vapi Voice Flow
1. `POST /vapi/call/start` → Vapi calls customer from `+15752136058`
2. AI agent runs recovery conversation (prompt in `voice_service.py`)
3. Call ends → Vapi POSTs `end-of-call-report` to `/vapi/webhook`
4. Full transcript extracted → Groq NLU → FSM → PostgreSQL → WebSocket

## WhatsApp Bot Replies
Inbound message → `bot_reply()` → TwiML `<Message>` → Twilio sends automatically

| Customer says | Bot replies |
|---|---|
| `PAY` / `yes` / `1` | Confirms payment recorded |
| `DELAY` / `later` / `2` | Acknowledges, asks to reply PAY when ready |
| `DISPUTE` / `wrong` / `3` | Flags for specialist review |
| `CALL` / `agent` / `4` | Triggers Vapi outbound call to customer's number |
| `hello` / `hi` / `menu` | Full menu with all options |
