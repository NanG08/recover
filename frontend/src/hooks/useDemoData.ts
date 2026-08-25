import { useEffect } from 'react';
import { useStore } from '../store/state';
import { AuditEntry } from '../store/state';

/**
 * Hook that emits synthetic audit entries when demoMode is enabled.
 * Generates a new entry every `intervalMs` (default 2000 ms) and adds it to the store.
 */
export const useDemoData = (intervalMs: number = 2000) => {
  const { demoMode, addEntry } = useStore();

  useEffect(() => {
    if (!demoMode) return undefined;
    const interval = setInterval(() => {
      const now = new Date();
      const entry: AuditEntry = {
        timestamp: now.toISOString(),
        transaction_id: `demo_${Math.random().toString(36).substring(2, 10)}`,
        amount: Math.floor(Math.random() * 50000) + 1000,
        channel: Math.random() > 0.5 ? 'WHATSAPP' : 'VOICE',
        language: ['English', 'Hindi', 'Haryanvi'][Math.floor(Math.random() * 3)],
        intent: ['AGREE_TO_PAY', 'REQUEST_DELAY', 'DISPUTE'][Math.floor(Math.random() * 3)],
        confidence_score: parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)),
        razorpay_api_status: '200 OK',
        system_state: ['PAYMENT_RESOLVED', 'DELAY_GRANTED', 'ESCALATED'][Math.floor(Math.random() * 3)],
      };
      addEntry(entry);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [demoMode, intervalMs, addEntry]);
};
