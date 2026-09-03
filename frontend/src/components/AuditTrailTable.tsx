import React, { useState, useMemo, useEffect } from 'react'
import { useStore, AuditEntry } from '../store/state'
import { ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react'

const STATE_COLOR: Record<string, string> = {
  PAYMENT_RESOLVED:      'text-success',
  PROMISE_TO_PAY:        'text-accent-ice',
  DELAY_GRANTED:         'text-accent-ice',
  WHATSAPP_LINK_SENT:    'text-accent-ice',
  VOICE_OUTBOUND_QUEUED: 'text-accent-ice',
  ESCALATED_DISPUTE:     'text-error',
  ESCALATED:             'text-error',
}

const CHANNEL_COLOR: Record<string, string> = {
  WHATSAPP: 'text-success',
  VOICE:    'text-accent-ice',
}

const Row: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const [open, setOpen] = useState(false)
  const stateColor   = STATE_COLOR[entry.system_state]   ?? 'text-text-secondary'
  const channelColor = CHANNEL_COLOR[entry.channel?.toUpperCase()] ?? 'text-text-secondary'

  return (
    <>
      <tr className="border-b border-border hover:bg-bg-hover transition-colors duration-75">
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

const LIVE_INTENTS  = ['AGREE_TO_PAY', 'ASK_DELAY', 'DISPUTE_CHARGE']
const LIVE_LANGS    = ['Hindi', 'Haryanvi', 'English']
const LIVE_STATES   = ['PAYMENT_RESOLVED', 'PROMISE_TO_PAY', 'ESCALATED_DISPUTE']
const LIVE_CHANNELS = ['WHATSAPP', 'VOICE']

const AuditTrailTable: React.FC = () => {
  const { auditEntries, addEntry } = useStore()
  const [langFilter,  setLangFilter]  = useState('ALL')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [loading, setLoading]         = useState(false)

  // Fetch real history from backend on mount
  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/audit?limit=100')
      if (res.ok) {
        const data = await res.json() as { entries: AuditEntry[] }
        // Add in reverse so newest ends up at top of store
        ;[...data.entries].reverse().forEach(addEntry)
      }
    } catch { /* backend offline — mock data already in store */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchHistory() }, [])

  // Demo live-stream simulation (only when backend is offline)
  useEffect(() => {
    let counter = 0
    const id = setInterval(() => {
      addEntry({
        timestamp:           new Date().toLocaleTimeString('en-IN', { hour12: false }),
        transaction_id:      `txn_DEMO${String(counter).padStart(4, '0')}`,
        amount:              Math.floor(Math.random() * 200000) + 5000,
        channel:             LIVE_CHANNELS[counter % 2],
        language:            LIVE_LANGS[counter % LIVE_LANGS.length],
        intent:              LIVE_INTENTS[counter % LIVE_INTENTS.length],
        confidence_score:    parseFloat((0.75 + Math.random() * 0.24).toFixed(2)),
        razorpay_api_status: '200 OK',
        system_state:        LIVE_STATES[counter % LIVE_STATES.length],
      })
      counter++
    }, 5000)
    return () => clearInterval(id)
  }, [addEntry])

  const filtered = useMemo(() =>
    auditEntries.filter((e) =>
      (langFilter  === 'ALL' || e.language     === langFilter) &&
      (stateFilter === 'ALL' || e.system_state === stateFilter)
    ), [auditEntries, langFilter, stateFilter])

  return (
    <section className="bg-bg-surface border border-border">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="font-mono text-xs text-text-primary tracking-widest uppercase">Live Audit Trail</span>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-accent-ice transition-colors disabled:opacity-40"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            REFRESH
          </button>
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
            <option value="PROMISE_TO_PAY">PROMISE TO PAY</option>
            <option value="ESCALATED_DISPUTE">ESCALATED</option>
            <option value="WHATSAPP_LINK_SENT">WA SENT</option>
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
                  {loading ? 'LOADING...' : 'NO ENTRIES MATCH FILTER'}
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
