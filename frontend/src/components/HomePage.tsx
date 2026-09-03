import React from 'react'
import Header from './Header'
import MetricsBar from './MetricsBar'
import CallSimulator from './CallSimulator'
import WhatsAppPreview from './WhatsAppPreview'
import AuditTrailTable from './AuditTrailTable'
import { useWebSocket } from '../hooks/useWebSocket'
import { useDemoData } from '../hooks/useDemoData'
import { useStore } from '../store/state'

const HomePage: React.FC = () => {
  useWebSocket('/ws/audit')
  useDemoData(3000)

  const { demoMode, toggleDemoMode } = useStore()

  return (
    <div className="flex flex-col h-full bg-bg-base text-text-primary overflow-hidden">
      <Header />
      <MetricsBar />
      <main className="flex-1 overflow-auto p-4 space-y-4">
        {/* Demo mode banner */}
        <div className="flex items-center justify-between px-3 py-1.5 border border-border bg-bg-surface">
          <span className="font-mono text-[10px] text-text-secondary tracking-widest">
            DEMO MODE — synthetic events {demoMode ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <button
            onClick={() => toggleDemoMode(!demoMode)}
            className={`font-mono text-[10px] px-3 py-1 border transition-colors ${
              demoMode
                ? 'border-success/40 text-success hover:bg-success/10'
                : 'border-border text-text-secondary hover:border-accent-ice/40 hover:text-accent-ice'
            }`}
          >
            {demoMode ? '● STOP DEMO' : '○ START DEMO'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CallSimulator />
          <WhatsAppPreview />
        </div>
        <AuditTrailTable />
      </main>
    </div>
  )
}

export default HomePage
