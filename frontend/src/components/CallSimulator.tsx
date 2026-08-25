import React, { useEffect, useRef, useState } from 'react'
import { Mic, Radio } from 'lucide-react'

const TRANSCRIPT_LINES = [
  { raw: 'गेड़ दे भाई', highlight: 'गेड़ दे', tag: 'AGREE_TO_PAY' },
  { raw: 'हाँ भेज दूँगा अभी', highlight: 'भेज दूँगा', tag: 'CONFIRM' },
  { raw: 'ठीक है, कर दो', highlight: 'कर दो', tag: 'AGREE_TO_PAY' },
  { raw: 'UPI से भेज रहा हूँ', highlight: 'भेज रहा', tag: 'PAYMENT_INIT' },
  { raw: 'धन्यवाद भाई', highlight: 'धन्यवाद', tag: 'CLOSE' },
]

const CallSimulator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const [lines, setLines] = useState<typeof TRANSCRIPT_LINES>([])
  const [active, setActive] = useState(true)

  // Multi-bar waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const BAR_COUNT = 48
    let frame = 0

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const barW = width / BAR_COUNT
      for (let i = 0; i < BAR_COUNT; i++) {
        const amp = active
          ? Math.abs(Math.sin((i * 0.4 + frame * 0.08))) * 0.7 +
            Math.abs(Math.sin((i * 0.9 + frame * 0.05))) * 0.3
          : 0.05
        const barH = amp * (height * 0.85)
        const x = i * barW + barW * 0.15
        const y = (height - barH) / 2
        const alpha = 0.4 + amp * 0.6
        ctx.fillStyle = `rgba(56,189,248,${alpha})`
        ctx.fillRect(x, y, barW * 0.6, barH)
      }
      frame++
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [active])

  // Stream transcript lines
  useEffect(() => {
    let idx = 0
    const id = setInterval(() => {
      setLines((prev) => [...prev.slice(-4), TRANSCRIPT_LINES[idx % TRANSCRIPT_LINES.length]])
      idx++
    }, 1400)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="bg-bg-surface border border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Radio size={13} className="text-accent-ice" />
          <span className="font-mono text-xs text-text-primary tracking-widest uppercase">Call Inspector</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 border border-accent-ice/40 text-accent-ice">HARYANVI</span>
          <span className="font-mono text-[10px] px-2 py-0.5 border border-border text-text-secondary">DEVANAGARI</span>
          <button
            onClick={() => setActive((a) => !a)}
            className={`font-mono text-[10px] px-2 py-0.5 border transition-colors ${active ? 'border-success/40 text-success' : 'border-border text-text-secondary'}`}
          >
            {active ? '● LIVE' : '○ PAUSED'}
          </button>
        </div>
      </div>

      {/* Waveform */}
      <canvas ref={canvasRef} width={600} height={80} className="w-full bg-bg-base" />

      {/* Intent badges */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <Mic size={11} className="text-text-secondary" />
        <span className="font-mono text-[10px] text-text-secondary">INTENT</span>
        <span className="font-mono text-[10px] px-2 py-0.5 bg-accent-ice/10 border border-accent-ice/30 text-accent-ice">AGREE_TO_PAY</span>
        <span className="font-mono text-[10px] text-text-secondary ml-auto">CONF</span>
        <span className="font-mono text-[10px] text-success">0.96</span>
      </div>

      {/* Live transcript */}
      <div className="flex-1 px-4 py-3 font-mono text-sm space-y-1.5 min-h-[120px]">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2 text-text-secondary">
            <span className="text-border text-[10px] mt-0.5 shrink-0">›</span>
            <span>
              {line.raw.split(line.highlight).map((part, j, arr) => (
                <React.Fragment key={j}>
                  {part}
                  {j < arr.length - 1 && (
                    <mark className="bg-accent-ice/20 text-accent-ice px-0.5 not-italic">{line.highlight}</mark>
                  )}
                </React.Fragment>
              ))}
            </span>
            <span className="ml-auto font-mono text-[9px] text-border shrink-0">{line.tag}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CallSimulator
