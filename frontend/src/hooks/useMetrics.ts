// src/hooks/useMetrics.ts
import { useStore } from '../store/state';
import { useMemo } from 'react';

export const useMetrics = () => {
  const auditEntries = useStore((state) => state.auditEntries);

  const totals = useMemo(() => {
    const totalRecovered = auditEntries.reduce((sum, e) => {
      return e.system_state === 'PAYMENT_RESOLVED' ? sum + e.amount : sum;
    }, 0);
    const totalAttempts = auditEntries.length;
    const recoveryRate = totalAttempts ? (totalRecovered / (totalAttempts * 100)) * 100 : 0; // amount in paise
    const avgTime = totalAttempts ? totalAttempts / totalAttempts : 0; // placeholder, real timing would be stored
    return {
      totalRecovered: totalRecovered / 100, // convert paise to rupees
      recoveryRate,
      avgTime,
    };
  }, [auditEntries]);

  return totals;
};
