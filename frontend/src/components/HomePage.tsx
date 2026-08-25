import React from 'react'
import Header from './Header'
import MetricsBar from './MetricsBar'
import CallSimulator from './CallSimulator'
import WhatsAppPreview from './WhatsAppPreview'
import AuditTrailTable from './AuditTrailTable'

const HomePage: React.FC = () => (
  <div className="flex flex-col h-full bg-bg-base text-text-primary overflow-hidden">
    <Header />
    <MetricsBar />
    <main className="flex-1 overflow-auto p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CallSimulator />
        <WhatsAppPreview />
      </div>
      <AuditTrailTable />
    </main>
  </div>
)

export default HomePage
