import React, { useState } from 'react'
import { Phone, PhoneCall, PhoneOff, Loader } from 'lucide-react'

type CallState = 'idle' | 'calling' | 'queued' | 'error'

const STATUS_MAP: Record<CallState, { label: string; color: string }> = {
  idle:    { label: 'READY',          color: 'text-text-secondary border-border' },
  calling: { label: 'INITIATING...',  color: 'text-accent-ice border-accent-ice/40' },
  queued:  { label: 'CALL_QUEUED',    color: 'text-success border-success/40' },
  error:   { label: 'CALL_FAILED',    color: 'text-error border-error/40' },
}

const CallSimulator: React.FC = () => {
  const [phone, setPhone]       = useState('+91')
  const [amount, setAmount]     = useState('499')
  const [state, setState]       = useState<CallState>('idle')
  const [callSid, setCallSid]   = useState<string | null>(null)
  const [errMsg, setErrMsg]     = useState<string | null>(null)

  const handleCall = async () => {
    if (!phone || !amount) return
    setState('calling')
    setCallSid(null)
    setErrMsg(null)
    try {
      const res = await fetch('/api/vapi/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, amount: Math.round(parseFloat(amount) * 100) }),
      })
      const data = await res.json()
      if (res.ok) {
        setCallSid(data.sid ?? null)
        setState('queued')
      } else {
        setErrMsg(data.detail ?? 'Unknown error')
        setState('error')
      }
    } catch (err) {
      setErrMsg(String(err))
      setState('error')
    }
  }

  const { label, color } = STATUS_MAP[state]

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
          className="flex-1 bg-bg-base border border-border font-mono text-xs text-text-primary px-2 py-1.5 focus:outline-none focus:border-accent-ice/50 placeholder:text-text-secondary"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="₹ amount"
          className="w-24 bg-bg-base border border-border font-mono text-xs text-text-primary px-2 py-1.5 focus:outline-none focus:border-accent-ice/50"
        />
        <button
          onClick={handleCall}
          disabled={state === 'calling'}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-ice/40 font-mono text-[10px] text-accent-ice hover:bg-accent-ice/10 transition-colors disabled:opacity-40"
        >
          {state === 'calling'
            ? <Loader size={11} className="animate-spin" />
            : <PhoneCall size={11} />}
          CALL
        </button>
      </div>

      {/* Status area */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {state === 'queued' && callSid && (
          <div className="font-mono text-[10px] text-text-secondary space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Call queued successfully</span>
            </div>
            <div className="flex items-center gap-2 text-border">
              <span>SID</span>
              <span className="text-text-secondary truncate">{callSid}</span>
            </div>
            <div className="flex items-center gap-2 text-border">
              <span>TO</span>
              <span className="text-text-secondary">{phone}</span>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="font-mono text-[10px] text-error space-y-1">
            <div className="flex items-center gap-2">
              <PhoneOff size={11} />
              <span>Call failed</span>
            </div>
            {errMsg && <div className="text-border pl-4">{errMsg}</div>}
            <div className="text-border pl-4 pt-1">
              Ensure TWILIO_PHONE_NUMBER is set and the destination is a verified caller ID on trial accounts.
            </div>
          </div>
        )}

        {state === 'idle' && (
          <div className="font-mono text-[10px] text-text-secondary space-y-2">
            <p>Triggers an outbound Twilio Voice call to the customer.</p>
            <p className="text-border">
              Twilio will call the number, play a recovery prompt, collect speech, and feed the transcript into the FSM.
            </p>
            <p className="text-border pt-1">
              💡 Customer can also reply <span className="text-accent-ice">CALL</span> on WhatsApp to trigger a callback automatically.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default CallSimulator
