import React from 'react';
import { useStore } from '../store/state';

/**
 * Hero section displayed at the top of the landing page.
 * Uses the same styling as the original LandingPage hero.
 */
const HeroSection: React.FC<{ onEnter: () => void }> = ({ onEnter }) => (
  <div className="flex-1 flex flex-col justify-center items-center p-8 bg-bg-surface border-b border-border">
    <h1 className="text-5xl font-bold mb-4">Recover</h1>
    <p className="text-lg text-text-secondary max-w-2xl text-center mb-6">
      Dark‑mode, ultra‑minimalist revenue‑recovery UI built on a deterministic FSM engine.
      No LLMs, sub‑second latency, full visibility into every webhook.
    </p>
    <button
      onClick={onEnter}
      className="px-6 py-2 bg-accent-ice text-bg-base rounded hover:bg-accent-ice/80 transition"
    >
      Enter Dashboard
    </button>
  </div>
);

export default HeroSection;
