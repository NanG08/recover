// src/pages/Designer.tsx
import React, { useState } from 'react';
import { useStore, LayoutItem } from '../store/state';
import { Badge } from '../components/Badge';

/**
 * Simple designer UI that lets the user enable/disable sections of the landing page
 * and reorder them. The layout is persisted in localStorage via the store.
 */
interface Props {
  onDone: () => void; // called when user finishes designing
}

// All possible components that can appear on the landing page
const ALL_COMPONENTS: LayoutItem[] = [
  { id: 'hero', component: 'hero', order: 0 },
  { id: 'features', component: 'features', order: 1 },
  { id: 'metrics', component: 'metrics', order: 2 },
  { id: 'callSimulator', component: 'callSimulator', order: 3 },
  { id: 'whatsappPreview', component: 'whatsappPreview', order: 4 },
  { id: 'auditTrail', component: 'auditTrail', order: 5 },
];

const Designer: React.FC<Props> = ({ onDone }) => {
  const { layoutConfig, setLayoutConfig } = useStore();
  const [localConfig, setLocalConfig] = useState<LayoutItem[]>([...layoutConfig]);

  const toggleComponent = (id: string) => {
    const exists = localConfig.find((c) => c.id === id);
    if (exists) {
      // remove
      setLocalConfig(localConfig.filter((c) => c.id !== id));
    } else {
      // add at the end
      const comp = ALL_COMPONENTS.find((c) => c.id === id);
      if (comp) setLocalConfig([...localConfig, { ...comp, order: localConfig.length }]);
    }
  };

  const move = (index: number, direction: 'up' | 'down') => {
    const newConfig = [...localConfig];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newConfig.length) return;
    const tmp = newConfig[targetIdx];
    newConfig[targetIdx] = newConfig[index];
    newConfig[index] = tmp;
    // reassign order fields
    newConfig.forEach((c, i) => (c.order = i));
    setLocalConfig(newConfig);
  };

  const handleSave = () => {
    setLayoutConfig(localConfig);
    onDone();
  };

  return (
    <section className="flex flex-col h-full bg-bg-base text-text-primary p-6">
      <h2 className="text-3xl font-bold mb-4">Landing Page Designer</h2>
      <p className="mb-4 text-text-secondary">
        Enable/disable sections and reorder them. Changes are saved to localStorage.
      </p>
      <div className="flex-1 overflow-auto mb-4">
        {ALL_COMPONENTS.map((comp) => {
          const enabled = !!localConfig.find((c) => c.id === comp.id);
          return (
            <div key={comp.id} className="flex items-center justify-between border-b border-border py-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleComponent(comp.id)}
                  className="form-checkbox h-4 w-4 text-accent-ice"
                />
                <span className="capitalize text-text-primary">{comp.component}</span>
              </label>
              {enabled && (
                <div className="flex items-center gap-2">
                  <Badge variant="ice" onClick={() => move(localConfig.findIndex((c) => c.id === comp.id), 'up')}>↑</Badge>
                  <Badge variant="ice" onClick={() => move(localConfig.findIndex((c) => c.id === comp.id), 'down')}>↓</Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-accent-ice text-bg-base rounded hover:bg-accent-ice/80 transition"
        >
          Save &amp; Return
        </button>
        <button
          onClick={onDone}
          className="px-4 py-2 bg-success text-bg-base rounded hover:bg-success/80 transition"
        >
          Cancel
        </button>
      </div>
    </section>
  );
};

export default Designer;
