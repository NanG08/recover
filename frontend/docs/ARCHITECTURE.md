# Architecture Overview

```
User (Razorpay)                FastAPI Backend                 Redis                        PostgreSQL               WhatsApp Cloud API
   |                               |                           |                               |                         |
   |--- Webhook (payment.failed) -->|                           |                               |                         |
   |                               |--- Verify HMAC ---------->|                               |                         |
   |                               |                           |                               |                         |
   |                               |--- Deduplication (lock)-->+-------------------------------+                         |
   |                               |                           |                               |                         |
   |                               |--- Intent NLU (regex) --> |                               |                         |
   |                               |                           |                               |                         |
   |                               |--- FSM Transition ------->|                               |                         |
   |                               |                           |                               |                         |
   |                               |--- Side‑effect ---------->+--- WhatsApp Client (send buttons)                      |
   |                               |                           |                               |                         |
   |                               |--- Persist audit entry -->|                               |--- INSERT audit_trail -->|
   |                               |                           |                               |                         |
   |                               |--- Broadcast via WS ----->|--- Broadcast to UI (WebSocket)-----------------------------> Browser UI
```

**Latency Overview**
- HMAC verification: < 1 ms
- Intent classification (regex): ~0.5 ms
- FSM transition & side‑effects: < 5 ms (network calls async)
- Total end‑to‑end processing (excluding external API latency): **≈ 10–15 ms**

**Cost Comparison**
- No LLM token usage → **₹0** for AI inference.
- Cloud resources: free‑tier PostgreSQL (Supabase), free‑tier Redis (Docker local), FastAPI runs on a modest VM.

**Security Model**
- HMAC‑SHA256 signature verification for all incoming webhooks.
- Secrets stored in environment variables (`.env`).
- No secrets logged; all logs contain only `INFO` or `DEBUG` without secret values.
- Redis lock ensures idempotent processing of duplicate webhook retries.

---
*This document will be kept up‑to‑date as the engine evolves.*
