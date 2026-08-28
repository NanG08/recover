import React, { useEffect, useState } from 'react'
import { ArrowRight, Check, Circle, Radio, ShieldCheck, Sparkles } from 'lucide-react'

interface Props {
  onEnter: () => void;
}

const signals = [
  { label: 'Webhook intake', value: '99.98%' },
  { label: 'Median response', value: '3.8s' },
  { label: 'Language paths', value: '03' },
]

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  const [recovered, setRecovered] = useState(124820)
  const [activeSignal, setActiveSignal] = useState(0)

  useEffect(() => {
    const ticker = window.setInterval(() => setRecovered((value) => value + Math.floor(Math.random() * 420 + 80)), 2400)
    const signal = window.setInterval(() => setActiveSignal((value) => (value + 1) % signals.length), 1800)
    return () => {
      window.clearInterval(ticker)
      window.clearInterval(signal)
    }
  }, [])

  return (
    <section className="flex h-full flex-col overflow-auto bg-bg-base text-text-primary font-sans">
      <nav className="flex items-center justify-between border-b border-border bg-white/90 px-5 py-4 backdrop-blur md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black font-mono text-xs font-bold text-white">R/</div>
          <span className="font-semibold tracking-tight">Recover</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-success signal-pulse" />
          Systems nominal
        </div>
      </nav>

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-6 px-5 py-6 md:px-10 md:py-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-12">
        <div className="flex flex-col justify-center reveal-up">
          <div className="mb-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
            <Radio size={13} className="text-success" />
            Revenue recovery / live environment
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-7xl lg:text-[96px]">
            Make every<br /><span className="text-text-secondary">payment count.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-text-secondary md:text-lg">
            Recover turns failed payments into precise, human conversations across voice and WhatsApp. Deterministic decisions, visible outcomes.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button onClick={onEnter} className="group flex items-center gap-4 bg-black px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5">
              Open control center
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
            <span className="flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-secondary">
              <ShieldCheck size={14} /> No LLM decisions
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-end gap-4 reveal-up" style={{ animationDelay: '120ms' }}>
          <div className="border border-black bg-black p-6 text-white md:p-8">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Recovered today</span>
              <Sparkles size={16} className="text-[#b9f27c]" />
            </div>
            <div className="mt-10 font-mono text-4xl tracking-[-0.05em] md:text-6xl">₹{recovered.toLocaleString('en-IN')}</div>
            <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#b9f27c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b9f27c] signal-pulse" /> Live rolling total
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px border border-border bg-border">
            {signals.map((signal, index) => (
              <div key={signal.label} className={`min-h-[112px] bg-white p-3 transition-colors md:p-4 ${activeSignal === index ? 'bg-[#f0f0eb]' : ''}`}>
                <div className="mb-5 flex items-center justify-between"><Circle size={8} className={activeSignal === index ? 'fill-black text-black' : 'text-border'} /><span className="font-mono text-[9px] text-text-secondary">0{index + 1}</span></div>
                <div className="font-mono text-sm font-semibold">{signal.value}</div>
                <div className="mt-1 text-[10px] text-text-secondary">{signal.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary"><Check size={13} className="text-success" /> Audit-ready by default</div>
        </div>
      </main>
    </section>
  )
}

export default LandingPage
