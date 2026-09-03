# Recover — AI-Powered Payment Recovery Engine

> Built for [Razorpay Buildathon](https://razorpay.com/buildathon/)

Recover automates failed payment follow-ups via **Voice** and **WhatsApp**, using a deterministic FSM + LLM intent classification to resolve payments without human agents.

---

## What it does

When a `payment.failed` webhook arrives from Razorpay:

1. **Intent classification** — Groq `llama-3.3-70b-versatile` classifies the customer's response (`AGREE_TO_PAY` / `ASK_DELAY` / `DISPUTE_CHARGE`) with regex fallback for zero-downtime
2. **FSM transitions** — State machine moves the payment through `INITIATED → PROMISE_TO_PAY → PAYMENT_RESOLVED` (or `ESCALATED_DISPUTE` after 2 retries)
3. **Side-effects** — Razorpay Payment Link created, WhatsApp button message sent via Twilio, or outbound voice call placed
4. **Audit trail** — Every event persisted to PostgreSQL and streamed live to the dashboard via WebSocket

```
Razorpay webhook → HMAC verify → Redis dedup lock → Groq NLU → FSM → Payment Link API
                                                                    ↓
                                                          PostgreSQL + WebSocket → Dashboard
```

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + psycopg3 + Redis |
| NLU | Groq `llama-4-maverick-17b-128e-instruct` + regex fallback |
| Payments | Razorpay Payment Links API |
| Messaging | Twilio Voice + WhatsApp |
| Frontend | React + Vite + TypeScript + Tailwind + Zustand |
| Infra | Docker Compose (Postgres 16 + Redis 7) |

---

## Quick Start

### Prerequisites
- Docker Desktop running
- Python 3.11+ with a venv
- Node.js 18+

### 1. Clone and configure

```bash
cp .env.example .env
# Fill in: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, TWILIO_*, GROQ_API_KEY
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

### 2. Start infrastructure

```bash
docker-compose up postgres redis -d
```

### 3. Start backend

```bash
cd recover
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 4. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard → [http://localhost:5173](http://localhost:5173)  
API docs → [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Key API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhook` | Razorpay webhook (HMAC verified) |
| `POST` | `/demo` | Inject synthetic event for UI testing |
| `GET` | `/audit` | Paginated audit trail from PostgreSQL |
| `WS` | `/ws/audit` | Live audit stream |
| `GET/POST` | `/webhook/whatsapp` | Meta WhatsApp Cloud API |
| `POST` | `/twilio/voice/incoming` | Twilio Voice TwiML |
| `POST` | `/twilio/whatsapp/send` | Send WhatsApp payment reminder |

---

## FSM State Transitions

```
INITIATED ──AGREE_TO_PAY──→ PAYMENT_RESOLVED
         ──ASK_DELAY──────→ PROMISE_TO_PAY ──AGREE_TO_PAY──→ PAYMENT_RESOLVED
         ──DISPUTE_CHARGE─→ ESCALATED_DISPUTE
         ──(2 retries)────→ ESCALATED_DISPUTE
```

---

## Multi-dialect NLU

Supports **English**, **Hindi**, and **Haryanvi** — Groq `llama-4-maverick-17b-128e-instruct` handles natural speech like _"haan bhai pay kar dunga"_ that regex alone would miss. Regex patterns serve as an instant fallback if the Groq API is unavailable.

---

## Security

- HMAC-SHA256 signature verification on all Razorpay webhooks
- Redis idempotency lock (30s TTL) prevents duplicate processing
- No secrets logged; all credentials via environment variables
