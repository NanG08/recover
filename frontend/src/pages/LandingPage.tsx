import React, { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, Check, Circle, Radio, ShieldCheck, Sparkles, Workflow } from 'lucide-react'

interface Props {
  onEnter: () => void;
}

const signals = [
  { label: 'Webhook intake', value: '99.98%' },
  { label: 'Median response', value: '3.8s' },
  { label: 'Language paths', value: '03' },
]

const PIPELINE = [
  ['01', 'payment.failed webhook received'],
  ['02', 'HMAC signature verified + Redis dedup lock'],
  ['03', 'Groq LLM classifies intent (EN / HI / HR)'],
  ['04', 'FSM transitions state, enforces retry limit'],
  ['05', 'Razorpay Payment Link created via API'],
  ['06', 'WhatsApp or Voice outreach via Twilio'],
  ['07', 'Audit entry → PostgreSQL + WebSocket broadcast'],
]

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  const [recovered, setRecovered] = useState(124820)
  const [activeSignal, setActiveSignal] = useState(0)

  useEffect(() => {
    const ticker = window.setInterval(() => setRecovered((v) => v + Math.floor(Math.random() * 420 + 80)), 2400)
    const signal = window.setInterval(() => setActiveSignal((v) => (v + 1) % signals.length), 1800)
    return () => { window.clearInterval(ticker); window.clearInterval(signal) }
  }, [])

  return (
    <section className="flex h-full flex-col overflow-auto bg-bg-base text-text-primary font-sans">
      <nav className="flex items-center justify-between border-b border-black bg-black px-5 py-4 text-white md:px-10">
        <div className="flex items-center gap-3">
          <img src="/Recover.jpg" alt="Recover" className="h-12 w-44 object-contain object-left invert" />
        </div>
        <div className="flex items-center gap-3 font-ui text-xs uppercase tracking-[0.18em] text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-success signal-pulse" />
          Systems nominal
        </div>
      </nav>

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-6 px-5 py-6 md:px-10 md:py-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-12">
        <div className="flex flex-col justify-center reveal-up">
          <div className="mb-8 flex items-center gap-2 font-ui text-[10px] uppercase tracking-[0.2em] text-text-secondary">
            <Radio size={13} className="text-success" />
            Revenue recovery / live environment
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-7xl lg:text-[96px]">
            Make every<br /><span className="text-text-secondary">payment count.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-text-secondary md:text-lg">
            Recover turns failed payments into precise, human conversations across voice and WhatsApp — powered by Groq LLM intent classification and a deterministic FSM.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button onClick={onEnter} className="group flex items-center gap-4 bg-black px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5">
              Open control center
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
            <span className="flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-secondary">
              <ShieldCheck size={14} /> Groq NLU + FSM
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-start gap-4 pt-2 reveal-up md:pt-8" style={{ animationDelay: '120ms' }}>
          <div className="border border-black bg-black p-6 text-white md:p-8">
            <div className="flex items-start justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/60">Recovered today</span>
              <Sparkles size={16} className="text-[#b9f27c]" />
            </div>
            <div className="mt-10 font-mono text-4xl tracking-[-0.05em] md:text-6xl">₹{recovered.toLocaleString('en-IN')}</div>
            <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.15em] text-[#b9f27c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b9f27c] signal-pulse" /> Live rolling total
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px border border-border bg-border">
            {signals.map((signal, index) => (
              <div key={signal.label} className={`min-h-[112px] bg-white p-3 transition-colors md:p-4 ${activeSignal === index ? 'bg-[#f0f0eb]' : ''}`}>
                <div className="mb-5 flex items-center justify-between"><Circle size={9} className={activeSignal === index ? 'fill-black text-black' : 'text-border'} /><span className="font-mono text-[11px] text-text-secondary">0{index + 1}</span></div>
                <div className="font-mono text-base font-semibold">{signal.value}</div>
                <div className="mt-1 text-xs text-text-secondary">{signal.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-text-secondary"><Check size={14} className="text-success" /> Audit-ready by default</div>
        </div>
      </main>

      <section className="border-y border-border bg-[#f7f7f5] px-5 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="font-ui text-xs uppercase tracking-[0.18em] text-text-secondary">How Recover works</div>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl">A calm path from signal to resolution.</h2>
            </div>
            <span className="hidden font-mono text-xs text-text-secondary md:block">01 / 03</span>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
            {[
              ['01', 'Listen for the signal', 'A failed payment enters through a verified Razorpay webhook and becomes an actionable recovery case.'],
              ['02', 'Classify and act', 'Groq LLM detects customer intent in English, Hindi, or Haryanvi. The FSM picks the right channel and message.'],
              ['03', 'Make the outcome visible', 'Every intent, state change, and API call is written to the live audit trail in real time.'],
            ].map(([number, title, description]) => (
              <article key={number} className="bg-white p-5 md:p-7">
                <div className="font-mono text-sm text-success">{number}</div>
                <h3 className="mt-10 text-xl font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 border-t border-border px-5 py-10 md:px-10 lg:grid-cols-2 lg:gap-12">
        {/* Pipeline steps */}
        <div className="border border-border bg-white p-6 md:p-8">
          <div className="flex items-center gap-2 font-ui text-xs uppercase tracking-[0.18em] text-text-secondary">
            <ShieldCheck size={14} /> Recovery pipeline
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Webhook to resolution.</h2>
          <div className="mt-6 space-y-3">
            {PIPELINE.map(([n, step]) => (
              <div key={n} className="flex items-start gap-3 font-mono text-xs">
                <span className="text-success shrink-0">{n}</span>
                <span className="text-text-secondary">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recovery flow */}
        <div className="border border-border bg-black p-6 text-white md:p-8">
          <div className="flex items-center gap-2 font-ui text-xs uppercase tracking-[0.18em] text-white/60"><Workflow size={14} /> Recovery user flow</div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">From failed to recovered.</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-4 md:items-center">
            {['Payment fails', 'Intent detected', 'Human channel', 'Payment recovered'].map((step, index) => (
              <React.Fragment key={step}>
                <div className={`border p-4 transition-colors ${index === activeSignal ? 'border-[#b9f27c] bg-white/10' : 'border-white/20'}`}>
                  <div className="font-mono text-xs text-[#b9f27c]">0{index + 1}</div>
                  <div className="mt-7 text-sm font-medium">{step}</div>
                </div>
                {index < 3 && <ArrowDown size={16} className="mx-auto text-white/40 md:rotate-[-90deg]" />}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-8 border-t border-white/20 pt-4 font-mono text-xs uppercase tracking-[0.16em] text-white/50">Observable at every step</div>
        </div>
      </section>

      <footer className="border-t border-black bg-black px-5 py-8 text-white md:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/Recover.jpg" alt="Recover" className="h-8 w-28 object-contain object-left invert" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Revenue recovery control</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-ui text-xs text-white/60">
            <span>Groq NLU + FSM</span>
            <span>Voice + WhatsApp</span>
            <span>Audit-ready</span>
          </div>
        </div>
      </footer>
    </section>
  )
}

export default LandingPage
