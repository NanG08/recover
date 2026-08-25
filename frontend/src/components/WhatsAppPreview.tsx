import React, { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

const PAYLOAD = {
  messaging_product: 'whatsapp',
  to: '+91XXXXXXXXXX',
  type: 'interactive',
  interactive: {
    type: 'button',
    body: { text: 'Your payment of ₹499.00 is pending. Tap below to resolve instantly.' },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'pay_now', title: 'Pay via UPI' } },
        { type: 'reply', reply: { id: 'need_time', title: 'Need 3 Days' } },
      ],
    },
  },
}

const STATE_MAP: Record<string, { label: string; color: string }> = {
  idle:    { label: 'WHATSAPP_LINK_SENT',   color: 'text-accent-ice border-accent-ice/40' },
  pay:     { label: 'PAYMENT_INITIATED',    color: 'text-success border-success/40' },
  delay:   { label: 'DELAY_REQUESTED',      color: 'text-error border-error/40' },
}

const WhatsAppPreview: React.FC = () => {
  const [fsm, setFsm] = useState<keyof typeof STATE_MAP>('idle')
  const [showPayload, setShowPayload] = useState(false)

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

      {/* Phone frame */}
      <div className="flex justify-center py-5 px-4">
        <div className="w-64 bg-[#111214] border border-border rounded-lg overflow-hidden shadow-lg">
          {/* Status bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0b] border-b border-border">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="font-mono text-[10px] text-text-secondary">+91XXXXXXXXXX</span>
            <span className="ml-auto font-mono text-[9px] text-border">META CLOUD API</span>
          </div>

          {/* Message bubble */}
          <div className="p-3">
            <div className="bg-[#1a1d22] border border-border rounded p-3 text-xs text-text-primary font-sans leading-relaxed">
              {PAYLOAD.interactive.body.text}
            </div>

            {/* Buttons */}
            <div className="mt-2 space-y-1.5">
              {PAYLOAD.interactive.action.buttons.map((btn) => (
                <button
                  key={btn.reply.id}
                  onClick={() => setFsm(btn.reply.id === 'pay_now' ? 'pay' : 'delay')}
                  className={`w-full py-2 font-mono text-xs border transition-all duration-100 ${
                    (fsm === 'pay' && btn.reply.id === 'pay_now') ||
                    (fsm === 'delay' && btn.reply.id === 'need_time')
                      ? 'bg-accent-ice/10 border-accent-ice text-accent-ice'
                      : 'border-border text-text-secondary hover:border-accent-ice/40 hover:text-text-primary'
                  }`}
                >
                  {btn.reply.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Raw payload toggle */}
      <div className="border-t border-border mt-auto">
        <button
          onClick={() => setShowPayload((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 font-mono text-[10px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>VIEW RAW META PAYLOAD</span>
          {showPayload ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showPayload && (
          <pre className="px-4 pb-3 font-mono text-[10px] text-text-secondary bg-bg-base overflow-x-auto whitespace-pre-wrap border-t border-border">
            {JSON.stringify(PAYLOAD, null, 2)}
          </pre>
        )}
      </div>
    </section>
  )
}

export default WhatsAppPreview
