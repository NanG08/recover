# FRONTEND DEVELOPMENT & TROUBLESHOOTING LOG

## [v0.2.0 — AfterNow Redesign]

### Components Built / Rewritten
- `Header.tsx` — Live latency pulse, animated ping dot, OPERATIONAL status badge
- `MetricsBar.tsx` — 4-card grid with radial glow on hover, derived from Zustand store
- `CallSimulator.tsx` — Multi-bar canvas waveform (48 bars), streaming Hindi/Haryanvi transcript with regex highlight, LIVE/PAUSED toggle
- `WhatsAppPreview.tsx` — Phone-frame mock, FSM state transitions on button click, collapsible raw Meta payload drawer
- `AuditTrailTable.tsx` — Dense data grid, dialect + state filters, live row injection every 4s, collapsible raw payload per row
- `HomePage.tsx` — Stripped to pure dashboard layout (no hero section)

### UI/UX Decisions
- Applied `#080809` void background with `#1F222B` 1px borders throughout
- Replaced rounded pill buttons with sharp 0px/4px radius ice-blue accent elements
- Noise texture via inline SVG data URI — eliminates `/noise.png` 404
- Metrics bar uses `gap-px bg-border` grid trick for seamless 1px dividers between cards
- Waveform uses 48 vertical bars instead of a sine line — more authentic audio visualizer feel
- All numerical data in `font-mono`, labels in `font-sans` uppercase tracking-widest

### Problems Encountered & Resolutions
- **Issue**: PostCSS error — `@import` after `@tailwind` directives in `index.css`
  - **Resolution**: Moved Google Fonts `@import` to line 1, before all `@tailwind` directives
- **Issue**: Zustand v4 removed default export; `import create from 'zustand'` throws at runtime
  - **Resolution**: Changed to named import `import { create } from 'zustand'`
- **Issue**: `devtools` middleware caused type inference issues with strict TS
  - **Resolution**: Removed `devtools` wrapper; store is simple enough without it
- **Issue**: `useWebSocket` crashed the app when backend is offline during frontend-only dev
  - **Resolution**: Wrapped WebSocket constructor in try/catch; errors are silently swallowed
- **Issue**: Missing `/noise.png` caused a 404 on every page load
  - **Resolution**: Replaced with inline SVG `feTurbulence` data URI in `index.css`
- **Issue**: `react-window` FixedSizeList incompatible with variable-height collapsible rows
  - **Resolution**: Replaced with native `<table>` + `overflow-auto max-h` scroll container; simpler and more flexible

## [v0.1.0 — Initial Scaffold]
- Bootstrapped Vite + React + TypeScript project
- Installed: `zustand`, `framer-motion`, `lucide-react`, `react-window`, `clsx`, `tailwindcss`
- Set up Tailwind design tokens: `bg-base`, `bg-surface`, `accent-ice`, `success`, `error`, `border`
- Created initial component stubs for all 5 zones
