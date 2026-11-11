'use client';

import { useState, type ReactNode } from 'react';

export interface SurfaceTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface SurfaceTabsProps {
  tabs: SurfaceTab[];
  initialTab?: string;
}

/** Tab row for multi-view surfaces (Plan, Library). */
export function SurfaceTabs({ tabs, initialTab }: SurfaceTabsProps) {
  const [active, setActive] = useState(
    () => tabs.find((t) => t.id === initialTab)?.id ?? tabs[0]?.id,
  );

  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="surface-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active}
            className={`surface-tab${tab.id === active ? ' active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current?.content}
    </div>
  );
}
