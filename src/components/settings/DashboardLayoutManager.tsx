'use client';

import { useEffect, useState } from 'react';

interface WidgetDef {
  id: string;
  label: string;
  description: string;
}

/**
 * Reorder Today's widgets. Up/down controls rather than HTML5 drag —
 * reliable on the touch kiosk where native drag is fiddly. Order applies
 * within the rail and the below-fold grid (the hero + timeline are fixed).
 */
export function DashboardLayoutManager() {
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard-order')
      .then((r) => r.json())
      .then((d: { widgets: WidgetDef[]; order: string[] }) => {
        setWidgets(d.widgets ?? []);
        setOrder(d.order ?? []);
      })
      .catch(() => setError('Failed to load layout'));
  }, []);

  const byId = new Map(widgets.map((w) => [w.id, w]));
  const ordered = order.map((id) => byId.get(id)).filter((w): w is WidgetDef => w !== undefined);

  function move(index: number, delta: number) {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError('Save failed');
    }
    setSaving(false);
  }

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Reorder how widgets appear on Today. Use the visibility toggles above to hide widgets entirely.
      </p>
      <div style={{ display: 'grid', gap: '0.375rem', marginBottom: '0.75rem' }}>
        {ordered.map((w, i) => (
          <div
            key={w.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(42, 47, 53, 0.40)',
              border: '1px solid rgba(216, 204, 192,0.1)',
              borderRadius: 6,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--muted)', width: '1.5rem' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, color: 'var(--beige-light)', fontSize: '0.875rem' }}>{w.label}</span>
            <button className="pill" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button className="pill" onClick={() => move(i, 1)} disabled={i === ordered.length - 1} aria-label="Move down">↓</button>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="btn-glow">
        {saving ? 'Saving…' : 'Save order'}
      </button>
      {saved && <span style={{ color: 'var(--glow-track)', fontSize: '0.75rem', marginLeft: '0.75rem' }}>Saved</span>}
      {error && <span style={{ color: 'var(--glow-urgent)', fontSize: '0.75rem', marginLeft: '0.75rem' }}>{error}</span>}
    </div>
  );
}
