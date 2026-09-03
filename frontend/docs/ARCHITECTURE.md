# Architecture Overview

```
Razorpay (payment.failed)
        |
        ▼
FastAPI /webhook
  ├── HMAC-SHA256 signature verify
  ├── Redis dedup lock (30s TTL per payment_id)
  ├── Groq LLM intent classification (EN/HI/HR) → regex fallback
  ├── FSM transition (retry limit: 2)
  ├── Side-effects:
  │     ├── WHATSAPP → Twilio sandbox plain-text message
  │     └── VOICE    → Vapi AI agent outbound call
  ├── INSERT audit_trail → PostgreSQL
  └── Broadcast → WebSocket → Dashboard

Inbound WhatsApp reply (Twilio sandbox)
        |
        ▼
FastAPI /twilio/whatsapp/incoming
  ├── bot_reply() → TwiML <Message> (automated reply)
  ├── If "CALL" → Vapi outbound call triggered
  └── FSM processes intent → audit trail

Vapi call ends
        |
        ▼
FastAPI /vapi/webhook (end-of-call-report)
  ├── Full transcript extracted
  ├── Groq classifies intent from transcript
  └── FSM processes → audit trail → WebSocket
```

## Latency
- HMAC verification: < 1ms
- Groq intent classification: ~300–600ms (regex fallback: < 1ms)
- FSM transition + side-effects: < 5ms (excluding external API)
- Total end-to-end (excluding Twilio/Vapi network): **≈400ms–700ms**

## NLU
- Primary: Groq `meta-llama/llama-4-maverick-17b-128e-instruct`
- Fallback: regex patterns for EN / HI (Hindi) / HR (Haryanvi)
- Fallback activates automatically if Groq API is unavailable or key is missing

## Voice — Vapi.ai
- Outbound AI agent calls via `POST /vapi/call/start`
- Agent prompt instructs recovery conversation in EN/HI
- Full call transcript posted to `POST /vapi/webhook` on call end
- Transcript fed into Groq NLU → FSM → audit trail
- Phone number: `+15752136058` (Vapi, permanent)

## WhatsApp — Twilio Sandbox
- Outbound payment reminders via `POST /twilio/whatsapp/send`
- Plain-text body (no template approval needed on sandbox)
- Inbound replies handled at `POST /twilio/whatsapp/incoming`
- Automated bot replies via TwiML `<Message>`
- Customer can reply CALL → triggers Vapi outbound call automatically

## Tunnel
- Permanent ngrok static domain: `motion-askew-durable.ngrok-free.dev`
- No URL rotation needed — start with `ngrok http --domain=motion-askew-durable.ngrok-free.dev 8000`

## Security
- HMAC-SHA256 on all Razorpay webhooks
- Redis idempotency lock (30s TTL) prevents duplicate webhook processing
- FSM retry limit (max 2) prevents customer harassment
- All secrets in `.env`, never logged
