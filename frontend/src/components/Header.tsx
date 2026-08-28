import React, { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Zap } from 'lucide-react'

const Header: React.FC = () => {
  const [latency, setLatency] = useState(14)
  const [pulse, setPulse] = useState(false)
  const [autopilot, setAutopilot] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setLatency(Math.floor(Math.random() * 12) + 8)
      setPulse(true)
      setTimeout(() => setPulse(false), 300)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between bg-white/95 backdrop-blur border-b border-border px-5 md:px-8 py-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-black text-white rounded-full font-mono text-xs font-bold">R/</div>
        <div>
          <span className="block font-sans font-bold text-text-primary tracking-tight text-sm">Recover</span>
          <span className="font-mono text-[9px] tracking-[0.22em] text-text-secondary uppercase">revenue control</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button
          onClick={() => setAutopilot((value) => !value)}
          className={`hidden sm:flex items-center gap-2 px-3 py-2 border text-[10px] font-mono tracking-widest uppercase transition-colors ${autopilot ? 'border-black bg-black text-white' : 'border-border text-text-secondary hover:border-black'}`}
          aria-pressed={autopilot}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${autopilot ? 'bg-[#b9f27c] signal-pulse' : 'bg-text-secondary'}`} />
          {autopilot ? 'Autopilot on' : 'Autopilot off'}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="font-mono text-[10px] text-success tracking-widest">OPERATIONAL</span>
        </div>

        <div className="flex items-center gap-1.5 text-text-secondary">
          <Activity size={12} className={pulse ? 'text-accent-ice' : ''} />
          <span className={`font-mono text-xs transition-colors ${pulse ? 'text-accent-ice' : 'text-text-secondary'}`}>
            {latency}ms
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-text-secondary">
          <Zap size={12} />
          <span className="hidden md:inline font-mono text-[10px]">NLU: FASTTEXT</span>
        </div>
        <ArrowUpRight size={15} className="text-text-secondary" />
      </div>
    </header>
  )
}

export default Header
