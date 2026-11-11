'use client';

import { useEffect, useState } from 'react';
import { buttonStyle } from './shared';

type WidgetDef = { id: string; label: string; description: string };

export function DashboardWidgetsManager() {
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard-widgets')
      .then((r) => r.json())
      .then((d: { widgets: WidgetDef[]; visibility: Record<string, boolean> }) => {
        setWidgets(d.widgets ?? []);
        setVisibility(d.visibility ?? {});
      })
      .catch(() => setError('Failed to load widget settings'));
  }, []);

  function toggle(id: string) {
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard-widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch {
      setError('Save failed');
    }
    setSaving(false);
  }

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Choose which widgets appear on the home dashboard. Refresh the home page after saving.
      </p>
      <div style={{ display: 'grid', gap: '0.375rem', marginBottom: '0.75rem' }}>
        {widgets.map((w) => (
          <label
            key={w.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(42, 47, 53, 0.40)',
              border: '1px solid rgba(216, 204, 192,0.1)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={visibility[w.id] ?? true}
              onChange={() => toggle(w.id)}
              style={{ marginTop: 3 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--beige-light)', fontSize: '0.875rem' }}>{w.label}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{w.description}</div>
            </div>
          </label>
        ))}
      </div>
      <button onClick={save} disabled={saving} style={buttonStyle}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && <span style={{ color: 'var(--forest-light)', fontSize: '0.75rem', marginLeft: '0.75rem' }}>Saved</span>}
      {error && <span style={{ color: '#dc3545', fontSize: '0.75rem', marginLeft: '0.75rem' }}>{error}</span>}
    </div>
  );
}

