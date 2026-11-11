'use client';

import { useState } from 'react';

interface SceneListProps {
  scenes: Array<{ id: string; haEntityId: string; name: string; icon: string | null }>;
  onActivate: (haEntityId: string) => Promise<boolean>;
}

export function SceneList({ scenes, onActivate }: SceneListProps) {
  const [flashId, setFlashId] = useState<string | null>(null);

  if (scenes.length === 0) {
    return (
      <p style={{ color: 'rgba(216, 204, 192,0.5)', fontSize: '0.8125rem' }}>
        No scenes configured — add in Settings.
      </p>
    );
  }

  async function handleActivate(haEntityId: string) {
    const ok = await onActivate(haEntityId);
    if (ok) {
      setFlashId(haEntityId);
      setTimeout(() => setFlashId(null), 1500);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
      }}
    >
      {scenes.map((scene) => {
        const isFlashing = flashId === scene.haEntityId;
        return (
          <button
            key={scene.id}
            onClick={() => handleActivate(scene.haEntityId)}
            style={{
              padding: '0.75rem 1.25rem',
              background: isFlashing
                ? 'rgba(45,74,62,0.4)'
                : 'rgba(176, 122, 79,0.2)',
              border: `1px solid ${isFlashing ? 'rgba(61,90,78,0.6)' : 'rgba(176, 122, 79,0.4)'}`,
              borderRadius: '10px',
              cursor: 'pointer',
              color: 'var(--beige-light)',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            {scene.icon && <span>{scene.icon}</span>}
            <span>{isFlashing ? 'Activated!' : scene.name}</span>
          </button>
        );
      })}
    </div>
  );
}
