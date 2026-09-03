import React, { useEffect, useState } from 'react'
import { Activity, Zap } from 'lucide-react'

const Header: React.FC = () => {
  const [latency, setLatency] = useState(14)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setLatency(Math.floor(Math.random() * 12) + 8)
      setPulse(true)
      setTimeout(() => setPulse(false), 300)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between bg-black border-b border-black px-6 py-3 shrink-0 text-white">
      <div className="flex items-center gap-3">
        <img
          src="/Recover.jpg"
          alt="Recover"
          className="h-10 w-36 object-contain object-left invert"
        />
        <span className="text-white/50 font-mono text-xs">/ CONTROL CENTER</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success signal-pulse" />
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
          <span className="font-mono text-[10px]">NLU: FASTTEXT</span>
        </div>
      </div>
    </header>
  )
}

export default Header
