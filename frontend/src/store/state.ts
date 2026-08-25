import { create } from 'zustand';

/**
 * Types for audit entries received via WebSocket.
 */
export type AuditEntry = {
  timestamp: string;
  transaction_id: string;
  amount: number;
  channel: string;
  language: string;
  intent: string;
  confidence_score: number;
  razorpay_api_status: string;
  system_state: string;
};

/**
 * Layout configuration for the dynamic designer homepage.
 */
export type LayoutItem = {
  id: string; // unique identifier
  component: 'hero' | 'features' | 'metrics' | 'callSimulator' | 'whatsappPreview' | 'auditTrail';
  order: number; // display order
};

/**
 * Zustand store state.
 */
type State = {
  // Real‑time data received from the backend
  auditEntries: AuditEntry[];
  // Demo mode flag – when true, synthetic data is generated locally
  demoMode: boolean;
  // Designer layout configuration – persisted in localStorage
  layoutConfig: LayoutItem[];

  // Store actions
  addEntry: (entry: AuditEntry) => void;
  clearEntries: () => void;
  toggleDemoMode: (enabled: boolean) => void;
  setLayoutConfig: (config: LayoutItem[]) => void;
};

/**
 * Helper to load persisted layout from localStorage (fallback to default).
 */
const loadLayout = (): LayoutItem[] => {
  try {
    const stored = localStorage.getItem('designerLayout');
    if (stored) return JSON.parse(stored) as LayoutItem[];
  } catch (e) {
    console.warn('Failed to parse stored layout', e);
  }
  // Default layout order
  return [
    { id: 'hero', component: 'hero', order: 0 },
    { id: 'features', component: 'features', order: 1 },
    { id: 'metrics', component: 'metrics', order: 2 },
    { id: 'callSimulator', component: 'callSimulator', order: 3 },
    { id: 'whatsappPreview', component: 'whatsappPreview', order: 4 },
    { id: 'auditTrail', component: 'auditTrail', order: 5 },
  ];
};

export const useStore = create<State>((set) => ({
  // Start with mock data for quick UI iteration
  auditEntries: [],
  demoMode: false,
  layoutConfig: loadLayout(),

  addEntry: (entry) =>
    set((s) => ({ auditEntries: [entry, ...s.auditEntries] })),

  clearEntries: () => set({ auditEntries: [] }),

  toggleDemoMode: (enabled) => set({ demoMode: enabled }),

  setLayoutConfig: (config) => {
    localStorage.setItem('designerLayout', JSON.stringify(config));
    set({ layoutConfig: config });
  },
}));
