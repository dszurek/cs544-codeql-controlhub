'use client';

import { useState } from 'react';
import { inputStyle, type ConfiguredScene } from './shared';

export function ScenesManager({ initialScenes }: { initialScenes: ConfiguredScene[] }) {
  const [scenes, setScenes] = useState(initialScenes);
  const [availableScenes, setAvailableScenes] = useState<Array<{ entity_id: string; friendly_name: string }>>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  async function loadAvailable() {
    setLoadingAvailable(true);
    try {
      const res = await fetch('/api/ha/states');
      const body = await res.json() as { states?: Array<{ entity_id: string; attributes: { friendly_name?: string } }> };
      const allStates = body.states ?? [];
      const sceneList = allStates
        .filter((s) => s.entity_id.startsWith('scene.'))
        .map((s) => ({
          entity_id: s.entity_id,
          friendly_name: s.attributes.friendly_name ?? s.entity_id,
        }));
      setAvailableScenes(sceneList);
    } catch { /* leave empty */ }
    setLoadingAvailable(false);
  }

  async function handleAdd() {
    if (!selectedEntity || !name) {
      setAddError('Select a scene and enter a name');
      return;
    }
    setAddError(null);
    try {
      const res = await fetch('/api/ha/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ haEntityId: selectedEntity, name, icon: icon || undefined }),
      });
      if (!res.ok) throw new Error('Request failed');
      const body = await res.json() as { scene: ConfiguredScene };
      setScenes([...scenes, body.scene]);
      setSelectedEntity('');
      setName('');
      setIcon('');
    } catch {
      setAddError('Failed to add scene');
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/ha/scenes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      setScenes(scenes.filter((s) => s.id !== id));
    } catch {
      /* ignore */
    }
  }

  const addButtonStyle: React.CSSProperties = {
    padding: '0.4375rem 1rem',
    background: 'rgba(176, 122, 79,0.25)',
    border: '1px solid rgba(176, 122, 79,0.4)',
    borderRadius: '6px',
    color: 'var(--leather-light)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  };

  return (
    <div>
      {scenes.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
          No scenes configured yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {scenes.map((scene) => (
            <div
              key={scene.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(42, 47, 53, 0.40)',
                border: '1px solid rgba(216, 204, 192,0.1)',
                borderRadius: '6px',
              }}
            >
              {scene.icon && <span style={{ fontSize: '1rem' }}>{scene.icon}</span>}
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--beige-light)', fontSize: '0.875rem' }}>{scene.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.6875rem' }}>{scene.haEntityId}</div>
              </div>
              <button
                onClick={() => handleRemove(scene.id)}
                aria-label={`Remove ${scene.name}`}
                style={{
                  background: 'none',
                  border: '1px solid rgba(220,53,69,0.4)',
                  color: '#dc3545',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(216, 204, 192,0.1)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <button
            onClick={loadAvailable}
            disabled={loadingAvailable}
            style={{
              padding: '0.4375rem 1rem',
              background: 'rgba(176, 122, 79,0.25)',
              border: '1px solid rgba(176, 122, 79,0.4)',
              borderRadius: '6px',
              color: 'var(--leather-light)',
              fontSize: '0.8125rem',
              cursor: loadingAvailable ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingAvailable ? 'Loading…' : 'Load available scenes from HA'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {availableScenes.length > 0 && (
            <select
              aria-label="Scene"
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(42, 47, 53, 0.55)',
                border: '1px solid rgba(216, 204, 192,0.15)',
                borderRadius: '6px',
                color: 'var(--beige-light)',
                fontSize: '0.875rem',
              }}
            >
              <option value="" disabled>Select a scene…</option>
              {availableScenes.map((s) => (
                <option key={s.entity_id} value={s.entity_id}>
                  {s.friendly_name} ({s.entity_id})
                </option>
              ))}
            </select>
          )}

          <input
            aria-label="Display name"
            placeholder="Display name (e.g., Morning)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            aria-label="Icon"
            placeholder="Icon (emoji, optional)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            style={inputStyle}
          />

          <button onClick={handleAdd} style={addButtonStyle}>Add Scene</button>
        </div>

        {addError && <p style={{ color: '#dc3545', fontSize: '0.6875rem' }}>{addError}</p>}
      </div>
    </div>
  );
}

