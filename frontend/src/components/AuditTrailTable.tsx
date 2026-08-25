import React, { useState, useMemo, useEffect } from 'react'
import { useStore, AuditEntry } from '../store/state'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'

const STATE_COLOR: Record<string, string> = {
  PAYMENT_RESOLVED: 'text-success',
  DELAY_GRANTED:    'text-accent-ice',
  ESCALATED:        'text-error',
}

const CHANNEL_COLOR: Record<string, string> = {
  WHATSAPP: 'text-success',
  VOICE:    'text-accent-ice',
}

const Row: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const [open, setOpen] = useState(false)
  const stateColor = STATE_COLOR[entry.system_state] ?? 'text-text-secondary'
  const channelColor = CHANNEL_COLOR[entry.channel] ?? 'text-text-secondary'

  return (
    <>
      <tr className="border-b border-border hover:bg-bg-hover transition-colors duration-75 group">
        <td className="px-3 py-2 font-mono text-[11px] text-text-secondary whitespace-nowrap">{entry.timestamp}</td>
        <td className="px-3 py-2 font-mono text-[11px] text-text-primary">{entry.transaction_id}</td>
        <td className="px-3 py-2 font-mono text-[11px] text-text-primary">₹{(entry.amount / 100).toFixed(2)}</td>
        <td className={`px-3 py-2 font-mono text-[11px] ${channelColor}`}>{entry.channel}</td>
        <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">{entry.language}</td>
        <td className="px-3 py-2 font-mono text-[11px] text-text-primary">{entry.intent}</td>
        <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">{(entry.confidence_score * 100).toFixed(0)}%</td>
        <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">{entry.razorpay_api_status}</td>
        <td className={`px-3 py-2 font-mono text-[11px] ${stateColor}`}>{entry.system_state}</td>
        <td className="px-3 py-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 font-mono text-[10px] text-border hover:text-accent-ice transition-colors"
          >
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            RAW
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-bg-base">
          <td colSpan={10} className="px-4 py-3">
            <pre className="font-mono text-[10px] text-text-secondary whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

// Seed a new mock entry every 4s to simulate live stream
const LIVE_INTENTS = ['AGREE_TO_PAY', 'REQUEST_DELAY', 'DISPUTE']
const LIVE_LANGS   = ['Hindi', 'Haryanvi', 'English']
const LIVE_STATES  = ['PAYMENT_RESOLVED', 'DELAY_GRANTED', 'ESCALATED']
const LIVE_CHANNELS = ['WHATSAPP', 'VOICE']

const AuditTrailTable: React.FC = () => {
  const { auditEntries, addEntry } = useStore()
  const [langFilter, setLangFilter]   = useState('ALL')
  const [stateFilter, setStateFilter] = useState('ALL')

  useEffect(() => {
    let counter = 100
    const id = setInterval(() => {
      const lang  = LIVE_LANGS[counter % LIVE_LANGS.length]
      const state = LIVE_STATES[counter % LIVE_STATES.length]
      addEntry({
        timestamp:          new Date().toLocaleTimeString('en-IN', { hour12: false }),
        transaction_id:     `txn_LIVE${counter.toString().padStart(4, '0')}`,
        amount:             Math.floor(Math.random() * 200000) + 5000,
        channel:            LIVE_CHANNELS[counter % 2],
        language:           lang,
        intent:             LIVE_INTENTS[counter % LIVE_INTENTS.length],
        confidence_score:   parseFloat((0.75 + Math.random() * 0.24).toFixed(2)),
        razorpay_api_status:'200 OK',
        system_state:       state,
      })
      counter++
    }, 4000)
    return () => clearInterval(id)
  }, [addEntry])

  const filtered = useMemo(() =>
    auditEntries.filter((e) =>
      (langFilter  === 'ALL' || e.language    === langFilter) &&
      (stateFilter === 'ALL' || e.system_state === stateFilter)
    ), [auditEntries, langFilter, stateFilter])

  return (
    <section className="bg-bg-surface border border-border">
      {/* Table header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="font-mono text-xs text-text-primary tracking-widest uppercase">Live Audit Trail</span>
        <div className="flex items-center gap-3">
          <Filter size={11} className="text-text-secondary" />
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="bg-bg-base border border-border font-mono text-[10px] text-text-secondary px-2 py-1 focus:outline-none focus:border-accent-ice/50"
          >
            <option value="ALL">ALL LANGS</option>
            <option value="Hindi">HINDI</option>
            <option value="Haryanvi">HARYANVI</option>
            <option value="English">ENGLISH</option>
          </select>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-bg-base border border-border font-mono text-[10px] text-text-secondary px-2 py-1 focus:outline-none focus:border-accent-ice/50"
          >
            <option value="ALL">ALL STATES</option>
            <option value="PAYMENT_RESOLVED">RESOLVED</option>
            <option value="DELAY_GRANTED">DELAYED</option>
            <option value="ESCALATED">ESCALATED</option>
          </select>
          <span className="font-mono text-[10px] text-text-secondary">{filtered.length} rows</span>
        </div>
      </div>

      <div className="overflow-auto max-h-[360px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-bg-base z-10">
            <tr className="border-b border-border">
              {['TIMESTAMP','TX ID','AMOUNT','CHANNEL','LANG','INTENT','CONF','API STATUS','STATE',''].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-mono text-[9px] tracking-widest text-text-secondary whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => (
              <Row key={`${entry.transaction_id}-${i}`} entry={entry} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center font-mono text-xs text-text-secondary">
                  NO ENTRIES MATCH FILTER
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AuditTrailTable
