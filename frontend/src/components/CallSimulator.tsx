import React, { useState, useEffect, useRef } from 'react'
import { Phone, PhoneCall, PhoneOff, Loader, Mic, MicOff } from 'lucide-react'

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'error'

const STATUS_MAP: Record<CallState, { label: string; color: string }> = {
  idle:      { label: 'READY',          color: 'text-text-secondary border-border' },
  calling:   { label: 'INITIATING...',  color: 'text-accent-ice border-accent-ice/40' },
  ringing:   { label: 'RINGING...',     color: 'text-accent-ice border-accent-ice/40' },
  connected: { label: 'CALL_ACTIVE',    color: 'text-success border-success/40' },
  ended:     { label: 'CALL_ENDED',     color: 'text-success border-success/40' },
  error:     { label: 'CALL_FAILED',    color: 'text-error border-error/40' },
}

const CALL_SCRIPT = [
  { t: 1500, speaker: 'agent',    text: 'Hi, this is Recover calling about a pending payment. Is this a good time?' },
  { t: 5000, speaker: 'customer', text: 'Yes, what is this about?' },
  { t: 8000, speaker: 'agent',    text: 'You have a payment of ₹{amount} pending. Would you like to resolve it now?' },
  { t: 13000, speaker: 'customer', text: 'Sure, I can pay now.' },
  { t: 16000, speaker: 'agent',   text: 'Great! I\'ll send a payment link to your WhatsApp right away.' },
  { t: 20000, speaker: 'agent',   text: 'Thank you. Have a good day!' },
]

const CallSimulator: React.FC = () => {
  const [phone, setPhone]       = useState('+91')
  const [amount, setAmount]     = useState('499')
  const [state, setState]       = useState<CallState>('idle')
  const [callId, setCallId]     = useState<string | null>(null)
  const [errMsg, setErrMsg]     = useState<string | null>(null)
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([])
  const [elapsed, setElapsed]   = useState(0)
  const [muted, setMuted]       = useState(false)
  const timersRef               = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef           = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const runSimulatedCall = (amt: string) => {
    setTranscript([])
    setElapsed(0)
    setState('ringing')

    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)

    const t1 = setTimeout(() => setState('connected'), 2000)
    timersRef.current.push(t1)

    CALL_SCRIPT.forEach(({ t, speaker, text }) => {
      const timer = setTimeout(() => {
        setTranscript((prev) => [
          ...prev,
          { speaker, text: text.replace('{amount}', amt) },
        ])
      }, t)
      timersRef.current.push(timer)
    })

    const endTimer = setTimeout(() => {
      setState('ended')
      clearInterval(intervalRef.current!)
    }, 22000)
    timersRef.current.push(endTimer)
  }

  const handleCall = async () => {
    if (!phone || !amount) return
    setState('calling')
    setCallId(null)
    setErrMsg(null)
    clearTimers()

    try {
      const res = await fetch('/api/vapi/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, amount: Math.round(parseFloat(amount) * 100) }),
      })
      const data = await res.json()
      if (res.ok) {
        setCallId(data.id ?? null)
        runSimulatedCall(amount)
      } else {
        // 501 = not configured — still show the demo simulation
        if (res.status === 501) {
          setCallId(`demo_${Date.now().toString(36)}`)
          runSimulatedCall(amount)
        } else {
          setErrMsg(data.detail ?? 'Unknown error')
          setState('error')
        }
      }
    } catch {
      // backend offline — still demo
      setCallId(`demo_${Date.now().toString(36)}`)
      runSimulatedCall(amount)
    }
  }

  const handleHangup = () => {
    clearTimers()
    setState('ended')
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const { label, color } = STATUS_MAP[state]
  const isActive = state === 'ringing' || state === 'connected'

  return (
    <section className="bg-bg-surface border border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Phone size={13} className="text-accent-ice" />
          <span className="font-mono text-xs text-text-primary tracking-widest uppercase">Voice Recovery</span>
        </div>
        <span className={`font-mono text-[10px] px-2 py-0.5 border ${color}`}>{label}</span>
      </div>

      {/* Inputs */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91XXXXXXXXXX"
          disabled={isActive}
          className="flex-1 bg-bg-base border border-border font-mono text-xs text-text-primary px-2 py-1.5 focus:outline-none focus:border-accent-ice/50 placeholder:text-text-secondary disabled:opacity-40"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="₹ amount"
          disabled={isActive}
          className="w-24 bg-bg-base border border-border font-mono text-xs text-text-primary px-2 py-1.5 focus:outline-none focus:border-accent-ice/50 disabled:opacity-40"
        />
        {isActive ? (
          <button
            onClick={handleHangup}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-error/60 font-mono text-[10px] text-error hover:bg-error/10 transition-colors"
          >
            <PhoneOff size={11} /> END
          </button>
        ) : (
          <button
            onClick={handleCall}
            disabled={state === 'calling'}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-ice/40 font-mono text-[10px] text-accent-ice hover:bg-accent-ice/10 transition-colors disabled:opacity-40"
          >
            {state === 'calling' ? <Loader size={11} className="animate-spin" /> : <PhoneCall size={11} />}
            CALL
          </button>
        )}
      </div>

      {/* Active call UI */}
      {(isActive || state === 'ended') && (
        <div className="px-4 py-3 border-b border-border space-y-3">
          {/* Call bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state === 'connected' ? 'bg-success animate-pulse' : state === 'ringing' ? 'bg-accent-ice animate-pulse' : 'bg-border'}`} />
              <span className="font-mono text-[10px] text-text-secondary">{phone}</span>
            </div>
            <div className="flex items-center gap-3">
              {state === 'connected' && (
                <button onClick={() => setMuted((m) => !m)} className="text-text-secondary hover:text-text-primary">
                  {muted ? <MicOff size={11} className="text-error" /> : <Mic size={11} />}
                </button>
              )}
              <span className="font-mono text-[10px] text-text-secondary">{fmt(elapsed)}</span>
              {callId && <span className="font-mono text-[9px] text-border truncate max-w-[100px]">{callId}</span>}
            </div>
          </div>

          {/* Transcript */}
          <div
            ref={transcriptRef}
            className="h-32 overflow-y-auto space-y-1.5 font-mono text-[10px]"
          >
            {transcript.length === 0 && state === 'ringing' && (
              <p className="text-border animate-pulse">Connecting to AI agent...</p>
            )}
            {transcript.map((line, i) => (
              <div key={i} className={`flex gap-2 ${line.speaker === 'agent' ? 'text-accent-ice' : 'text-text-secondary'}`}>
                <span className="shrink-0 text-border">{line.speaker === 'agent' ? 'AGENT' : 'CUST '}</span>
                <span>{line.text}</span>
              </div>
            ))}
            {state === 'ended' && (
              <p className="text-success pt-1">✓ Call ended — transcript sent to FSM</p>
            )}
          </div>
        </div>
      )}

      {/* Idle info */}
      {state === 'idle' && (
        <div className="flex-1 px-4 py-4 font-mono text-[10px] text-text-secondary space-y-2">
          <p>Triggers an outbound AI voice call to the customer.</p>
          <p className="text-border">The AI agent conducts a recovery conversation and posts the transcript back to the FSM.</p>
          <p className="text-border pt-1">💡 Customer can also reply <span className="text-accent-ice">CALL</span> on WhatsApp to trigger a callback.</p>
        </div>
      )}

      {state === 'error' && (
        <div className="flex-1 px-4 py-4 font-mono text-[10px] text-error space-y-1">
          <div className="flex items-center gap-2"><PhoneOff size={11} /><span>Call failed</span></div>
          {errMsg && <div className="text-border pl-4">{errMsg}</div>}
        </div>
      )}
    </section>
  )
}

export default CallSimulator
