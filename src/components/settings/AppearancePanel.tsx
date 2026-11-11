'use client';

import { useEffect, useState } from 'react';
import {
  ACCENTS,
  DEFAULT_APPEARANCE,
  appearanceToCssVars,
  type Appearance,
  type AccentName,
  type Density,
  type BlurBudget,
} from '@/lib/appearance';

/** Live-apply appearance vars to the document root for instant preview. */
function applyLive(a: Appearance) {
  const root = document.documentElement;
  const vars = appearanceToCssVars(a);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.setProperty('font-size', `${(a.fontScale * 100).toFixed(2)}%`);
}

export function AppearancePanel() {
  const [a, setA] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/appearance')
      .then((r) => r.json())
      .then((d) => d.appearance && setA(d.appearance))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Preview live as the user adjusts.
  useEffect(() => {
    if (loaded) applyLive(a);
  }, [a, loaded]);

  function patch(p: Partial<Appearance>) {
    setA((prev) => ({ ...prev, ...p }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance: a }),
      });
      setSaved(res.ok);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    patch(DEFAULT_APPEARANCE);
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: '0.35rem',
    letterSpacing: '0.04em',
  };
  const rowStyle: React.CSSProperties = { marginBottom: '1rem' };

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Changes preview instantly. Save to keep them (applied on every device at load).
      </p>

      {/* Accent */}
      <div style={rowStyle}>
        <label style={labelStyle}>Accent</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(Object.keys(ACCENTS) as AccentName[]).map((name) => (
            <button
              key={name}
              onClick={() => patch({ accent: name })}
              aria-pressed={a.accent === name}
              title={ACCENTS[name].label}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: a.accent === name ? '2px solid var(--beige-light)' : '2px solid transparent',
                background: `linear-gradient(135deg, ${ACCENTS[name].base}, ${ACCENTS[name].light})`,
                cursor: 'pointer',
                boxShadow: a.accent === name ? `0 0 12px ${ACCENTS[name].light}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Density */}
      <div style={rowStyle}>
        <label style={labelStyle}>Density</label>
        <Segmented<Density>
          options={['compact', 'cozy', 'comfortable']}
          value={a.density}
          onChange={(v) => patch({ density: v })}
        />
      </div>

      {/* Blur budget */}
      <div style={rowStyle}>
        <label style={labelStyle}>Glass blur (lower = faster on the Pi)</label>
        <Segmented<BlurBudget>
          options={['full', 'reduced', 'off']}
          value={a.blur}
          onChange={(v) => patch({ blur: v })}
        />
      </div>

      {/* Sliders */}
      <Slider
        label={`Ambient glow · ${a.ambientIntensity.toFixed(2)}`}
        min={0} max={1.5} step={0.05} value={a.ambientIntensity}
        onChange={(v) => patch({ ambientIntensity: v })}
      />
      <Slider
        label={`Font scale · ${Math.round(a.fontScale * 100)}%`}
        min={0.9} max={1.15} step={0.01} value={a.fontScale}
        onChange={(v) => patch({ fontScale: v })}
      />
      <Slider
        label={`Glass opacity · ${a.glassOpacity.toFixed(2)}×`}
        min={0.5} max={1.4} step={0.05} value={a.glassOpacity}
        onChange={(v) => patch({ glassOpacity: v })}
      />

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <button onClick={save} disabled={saving} className="btn-glow">
          {saving ? 'Saving…' : 'Save appearance'}
        </button>
        <button onClick={reset} className="pill">Reset to default</button>
        {saved && <span style={{ color: 'var(--glow-track)', fontSize: '0.75rem' }}>Saved</span>}
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)} className={`pill${value === opt ? ' active' : ''}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--leather-light)' }}
      />
    </div>
  );
}
