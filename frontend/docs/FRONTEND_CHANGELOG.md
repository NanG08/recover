# FRONTEND DEVELOPMENT & TROUBLESHOOTING LOG

## [v0.3.0 — Full Pipeline Fix]

### Components Fixed
- `HomePage.tsx` — Re-added `useWebSocket('/ws/audit')` call that was dropped in v0.2 rewrite; live backend events now stream into the audit table
- `WhatsAppPreview.tsx` — Wired "SEND" button to real `POST /api/twilio/whatsapp/send`; added phone + amount inputs; customer sim buttons now fire `POST /api/demo` to push a real event through the FSM pipeline; buttons disabled until message is sent; live API response shown inline
- `AuditTrailTable.tsx` — Fetches real history from `GET /api/audit` on mount; added REFRESH button; fixed state/channel color map to cover all FSM states (`PROMISE_TO_PAY`, `WHATSAPP_LINK_SENT`, `ESCALATED_DISPUTE`); demo interval slowed to 5s
- `useWebSocket.ts` — Auto-selects `wss://` under HTTPS, `ws://` under HTTP; suppresses console errors when backend is offline
- `vite.config.ts` — Added dev proxy: `/api/*` → `http://localhost:8000`, `/ws/*` → `ws://localhost:8000`

### Problems Encountered & Resolutions
- **Issue**: `useWebSocket` dropped from `HomePage` during v0.2 rewrite — no live events reached the UI
  - **Resolution**: Re-added hook call in `HomePage`
- **Issue**: WhatsApp button clicks were pure local state — never reached backend or FSM
  - **Resolution**: Wired to `POST /api/twilio/whatsapp/send`; sim clicks fire `POST /api/demo`
- **Issue**: Audit table empty on page load — no history fetch
  - **Resolution**: `useEffect` on mount calls `GET /api/audit`; gracefully falls back to mock data if backend offline
- **Issue**: `ws://` hardcoded — breaks under HTTPS/production
  - **Resolution**: Protocol auto-detected from `window.location.protocol`
- **Issue**: No Vite proxy — frontend fetch calls to `/api/*` returned 404 in dev
  - **Resolution**: Added `server.proxy` in `vite.config.ts`

---

## [v0.2.0 — AfterNow Redesign]

### Components Built / Rewritten
- `Header.tsx` — Live latency pulse, animated ping dot, OPERATIONAL status badge
- `MetricsBar.tsx` — 4-card grid with radial glow on hover, derived from Zustand store
- `CallSimulator.tsx` — Multi-bar canvas waveform (48 bars), streaming Hindi/Haryanvi transcript with regex highlight, LIVE/PAUSED toggle
- `WhatsAppPreview.tsx` — Phone-frame mock, FSM state transitions on button click, collapsible raw Meta payload drawer
- `AuditTrailTable.tsx` — Dense data grid, dialect + state filters, live row injection every 4s, collapsible raw payload per row
- `HomePage.tsx` — Stripped to pure dashboard layout (no hero section)

### Problems Encountered & Resolutions
- **Issue**: PostCSS error — `@import` after `@tailwind` directives in `index.css`
  - **Resolution**: Moved Google Fonts `@import` to line 1
- **Issue**: Zustand v4 removed default export
  - **Resolution**: Changed to named import `import { create } from 'zustand'`
- **Issue**: Missing `/noise.png` caused 404
  - **Resolution**: Replaced with inline SVG `feTurbulence` data URI
- **Issue**: `react-window` incompatible with variable-height collapsible rows
  - **Resolution**: Replaced with native `<table>` + `overflow-auto max-h` scroll container

## [v0.1.0 — Initial Scaffold]
- Bootstrapped Vite + React + TypeScript project
- Installed: `zustand`, `framer-motion`, `lucide-react`, `react-window`, `clsx`, `tailwindcss`
- Set up Tailwind design tokens
- Created initial component stubs
