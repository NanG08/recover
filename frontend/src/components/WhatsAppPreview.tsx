import React, { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp, Send, Loader } from 'lucide-react'

const STATE_MAP: Record<string, { label: string; color: string }> = {
  idle:    { label: 'AWAITING_SEND',      color: 'text-text-secondary border-border' },
  sending: { label: 'SENDING...',         color: 'text-accent-ice border-accent-ice/40' },
  sent:    { label: 'WHATSAPP_LINK_SENT', color: 'text-accent-ice border-accent-ice/40' },
  pay:     { label: 'PAYMENT_INITIATED',  color: 'text-success border-success/40' },
  delay:   { label: 'DELAY_REQUESTED',    color: 'text-error border-error/40' },
  error:   { label: 'SEND_FAILED',        color: 'text-error border-error/40' },
}

const WhatsAppPreview: React.FC = () => {
  const [phone, setPhone]           = useState('+91')
  const [amount, setAmount]         = useState('499')
  const [fsm, setFsm]               = useState<keyof typeof STATE_MAP>('idle')
  const [showPayload, setShowPayload] = useState(false)
  const [apiResponse, setApiResponse] = useState<object | null>(null)
  const [simClicked, setSimClicked]   = useState<string | null>(null)

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: `Your payment of ₹${amount} is pending. Tap below to resolve instantly.` },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'pay_now', title: 'Pay via UPI' } },
          { type: 'reply', reply: { id: 'need_time', title: 'Need 3 Days' } },
        ],
      },
    },
  }

  const handleSend = async () => {
    if (!phone || !amount) return
    setFsm('sending')
    setApiResponse(null)
    try {
      const res = await fetch('/api/twilio/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, amount: Math.round(parseFloat(amount) * 100) }),
      })
      const data = await res.json()
      setApiResponse(data)
      setFsm(res.ok ? 'sent' : 'error')
    } catch (err) {
      setApiResponse({ error: String(err) })
      setFsm('error')
    }
  }

  // Simulate customer tapping a reply button — fires the real inbound WhatsApp route
  const handleSimClick = async (btnId: string) => {
    setSimClicked(btnId)
    setFsm(btnId === 'pay_now' ? 'pay' : 'delay')
    try {
      await fetch('/api/twilio/whatsapp/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          Body: btnId === 'pay_now' ? 'PAY' : 'DELAY',
          From: `whatsapp:${phone}`,
          MessageSid: `SIM_${Date.now()}`,
        }),
      })
    } catch { /* backend offline */ }
  }

  const { label, color } = STATE_MAP[fsm]

  return (
    <section className="bg-bg-surface border border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-success" />
          <span className="font-mono text-xs text-text-primary tracking-widest uppercase">WhatsApp Preview</span>
        </div>
        <span className={`font-mono text-[10px] px-2 py-0.5 border ${color}`}>{label}</span>
      </div>

      {/* Send controls */}
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
          onClick={handleSend}
          disabled={fsm === 'sending'}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-ice/40 font-mono text-[10px] text-accent-ice hover:bg-accent-ice/10 transition-colors disabled:opacity-40"
        >
          {fsm === 'sending'
            ? <Loader size={11} className="animate-spin" />
            : <Send size={11} />}
          SEND
        </button>
      </div>

      {/* Phone frame */}
      <div className="flex justify-center py-4 px-4">
        <div className="w-[360px] max-w-full bg-[#111214] border border-[#2f373d] rounded-lg overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0b0c0d] border-b border-[#2f373d]">
            <div className={`w-2 h-2 rounded-full ${fsm === 'sent' || fsm === 'pay' || fsm === 'delay' ? 'bg-success' : 'bg-[#5b646a]'}`} />
            <span className="font-mono text-[11px] text-[#f3f4f2]">{phone || '+91XXXXXXXXXX'}</span>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-[#d8d9d3]">Meta Cloud API</span>
          </div>

          <div className="p-3">
            <div className="bg-[#1d2125] border border-[#3a3f43] rounded-md px-4 py-4 text-[15px] leading-relaxed text-[#f1f3f2] font-sans tracking-[-0.01em] shadow-inner">
              {payload.interactive.body.text}
            </div>

            <div className="mt-3 space-y-2">
              {payload.interactive.action.buttons.map((btn) => (
                <button
                  key={btn.reply.id}
                  onClick={() => handleSimClick(btn.reply.id)}
                  disabled={fsm !== 'sent'}
                  className={`w-full py-3 font-mono text-sm border transition-all duration-100 disabled:opacity-30 ${
                    simClicked === btn.reply.id
                      ? 'bg-[#dff6ec] border-[#9fe5c0] text-[#0f1720]'
                      : 'border-[#d7d8d1] bg-transparent text-[#f3f4f2] hover:border-[#c7d6d2] hover:bg-white/5'
                  }`}
                >
                  {btn.reply.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* API response + raw payload toggle */}
      {apiResponse && (
        <div className="mx-4 mb-2 px-3 py-2 bg-bg-base border border-border font-mono text-[10px] text-text-secondary">
          {JSON.stringify(apiResponse)}
        </div>
      )}

      <div className="border-t border-border mt-auto">
        <button
          onClick={() => setShowPayload((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 font-mono text-[10px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>VIEW RAW PAYLOAD</span>
          {showPayload ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showPayload && (
          <pre className="px-4 pb-3 font-mono text-[10px] text-text-secondary bg-bg-base overflow-x-auto whitespace-pre-wrap border-t border-border">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}
      </div>
    </section>
  )
}

export default WhatsAppPreview
