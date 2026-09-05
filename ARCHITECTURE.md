# Recover - Payment Recovery System

```mermaid
flowchart TB
    subgraph Client
        Frontend[Frontend\nReact + Vite\nDashboard UI\nServes on :5173]
    end

    subgraph Application[Application Layer]
        Backend[Backend - FastAPI\nREST API + WebSockets]
        FSM[FSM Orchestrator\nConversation state machine]
    end

    subgraph External[External Services - Production]
        Twilio[Twilio WhatsApp\nMessaging]
        Vapi[Vapi\nVoice calls]
        Razorpay[Razorpay\nPayment links + webhooks]
    end

    subgraph Stores[Data Stores]
        Postgres[(PostgreSQL\nPersistent event store)]
        Redis[(Redis\nCache + pub/sub for WebSockets)]
    end

    subgraph Mock[Mock Services - Demo]
        MockServices[Stubbed Twilio / Vapi / Razorpay\nNo external API keys required\nDemo purposes only]
    end

    subgraph Infrastructure[Infrastructure & Delivery]
        Docker[Docker Compose\nbackend + frontend + postgres + redis\nngrok optional public URL]
        Environment[Environment\n.env supplies credentials\nMock mode needs no keys]
        CICD[CI/CD - GitHub Actions\nSmoke tests + linters]
    end

    Frontend <-->|HTTP / WebSocket| Backend
    Backend --> FSM
    FSM -->|prod mode| Twilio
    FSM -->|prod mode| Vapi
    FSM -->|prod mode| Razorpay
    Backend --> Postgres
    Backend --> Redis
    FSM -->|demo mode| MockServices
    Docker --> Backend
    Docker --> Frontend
    Docker --> Postgres
    Docker --> Redis
    Environment --> Backend
    Environment --> Frontend
    CICD --> Backend
    CICD --> Frontend
```

## Components

- **Frontend:** React + Vite dashboard for operators.
- **Backend:** FastAPI REST and WebSocket API.
- **FSM Orchestrator:** Controls payment-recovery conversation states and actions.
- **External services:** Twilio WhatsApp, Vapi voice calls, and Razorpay payment links and webhooks.
- **PostgreSQL:** Persists recovery and audit events.
- **Redis:** Stores temporary state and publishes live dashboard updates.
- **Mock services:** Enable end-to-end demonstrations without production credentials.
- **Infrastructure:** Docker Compose runs the application services; environment variables provide configuration; GitHub Actions runs smoke tests and linters.
