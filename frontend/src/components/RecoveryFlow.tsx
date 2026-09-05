import React from 'react'
import { XCircle, Brain, Users, CheckCircle } from 'lucide-react'

interface Step {
  id: number
  title: string
  description: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Payment fails',
    description: 'Payment could not be completed – insufficient funds, network error, etc.',
    Icon: XCircle,
  },
  {
    id: 2,
    title: 'Intent detected',
    description: 'System recognises the user intent to recover the payment.',
    Icon: Brain,
  },
  {
    id: 3,
    title: 'Human channel',
    description: 'Customer is engaged via WhatsApp/voice for assistance.',
    Icon: Users,
  },
  {
    id: 4,
    title: 'Payment recovered',
    description: 'Payment succeeds and the order is marked as recovered.',
    Icon: CheckCircle,
  },
]

const RecoveryFlow: React.FC = () => (
  <section className="p-4">
    <h2 className="font-mono text-lg text-text-primary mb-4">Recovery user flow</h2>
    {steps.map((step) => (
      <div
        key={step.id}
        className="flex items-start gap-3 p-3 border border-border rounded hover:border-accent-ice/30 transition-colors"
      >
        <step.Icon size={24} className="mt-1 text-text-secondary" />
        <div className="flex flex-col">
          <h3 className="font-mono text-sm text-text-primary uppercase">{`0${step.id} – ${step.title}`}</h3>
          <p className="font-mono text-xs text-text-secondary mt-1">{step.description}</p>
        </div>
      </div>
    ))}
  </section>
);


export default RecoveryFlow
