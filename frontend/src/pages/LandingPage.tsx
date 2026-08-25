// src/pages/LandingPage.tsx
import React from 'react';
import { Badge } from '../components/Badge';

/**
 * Landing page that mimics the AfterNow style – dark background, monospaced text,
 * sharp borders and ice‑blue accents. It introduces the product and offers a
 * single call‑to‑action button that reveals the dashboard.
 */
interface Props {
  onEnter: () => void;
}

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  return (
    <section className="flex flex-col h-full bg-bg-base text-text-primary font-sans">
      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-bg-surface border-b border-border">
        <h1 className="text-5xl font-bold mb-4">Recover</h1>
        <p className="text-lg text-text-secondary max-w-2xl text-center mb-6">
          Dark‑mode, ultra‑minimalist revenue‑recovery UI built on a deterministic
          FSM engine. No LLMs, sub‑second latency, full visibility into every
          webhook.
        </p>
        <button
          onClick={onEnter}
          className="px-6 py-2 bg-accent-ice text-bg-base rounded hover:bg-accent-ice/80 transition"
        >
          Enter Dashboard
        </button>
      </div>

      {/* Feature list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8">
        <ul className="list-disc list-inside space-y-2 text-text-secondary">
          <li><Badge variant="ice">Real‑time audit trail via WebSocket</Badge></li>
          <li><Badge variant="ice">Interactive WhatsApp payload preview</Badge></li>
          <li><Badge variant="ice">Live call waveform & transcript inspector</Badge></li>
          <li><Badge variant="ice">Zero‑hallucination regex‑based NLU (Hindi/Haryanvi)</Badge></li>
          <li><Badge variant="ice">Metrics bar with recovery totals, rates & SLA monitor</Badge></li>
        </ul>
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm text-text-secondary mb-2">Ready to see it in action?</p>
          <button
            onClick={onEnter}
            className="px-4 py-1 bg-success text-bg-base rounded hover:bg-success/80 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </section>
  );
};

export default LandingPage;
