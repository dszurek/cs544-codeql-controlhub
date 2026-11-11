'use client';

import { useEffect, useState } from 'react';
import type { HealthSummary } from '@/lib/health/ingest';

function readinessGlow(r: number | null): string {
  if (r == null) return 'var(--muted)';
  if (r >= 70) return 'var(--glow-track)';
  if (r >= 40) return 'var(--glow-attend)';
  return 'var(--glow-urgent)';
}

function fmtMin(min: number | null | undefined): string {
  if (min == null) return '––';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmt(v: number | null | undefined, digits = 0): string {
  return v == null ? '––' : v.toFixed(digits);
}

function ReadinessRing({ value }: { value: number | null }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const R = 76;
  const C = 2 * Math.PI * R;
  const frac = value == null ? 0 : value / 100;
  const glow = readinessGlow(value);

  return (
    <div className="ready-ring" style={{ ['--glow' as string]: glow }}>
      <svg width="168" height="168" viewBox="0 0 168 168">
        <circle className="ring-track" cx="84" cy="84" r={R} fill="none" strokeWidth="9" />
        <circle
          className="ring-value"
          cx="84" cy="84" r={R}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={drawn ? C * (1 - frac) : C}
        />
      </svg>
      <div className="ring-label">
        <span className="ring-number">{value ?? '––'}</span>
        <span className="ring-caption">readiness</span>
      </div>
    </div>
  );
}

function EnergyChart({ energy, wakeHour }: { energy: HealthSummary['energy']; wakeHour: number }) {
  const W = 480;
  const H = 120;
  const pad = 14;
  const x = (hour: number) => pad + (hour / 23) * (W - pad * 2);
  const y = (level: number) => H - pad - level * (H - pad * 2);
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

  const path = energy.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.hour).toFixed(1)},${y(p.level).toFixed(1)}`).join(' ');
  const area = `${path} L${x(23)},${H - pad} L${x(0)},${H - pad} Z`;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Predicted energy across the day">
      <defs>
        <linearGradient id="energy-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--glow-track)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--glow-track)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 6, 12, 18, 23].map((h) => (
        <g key={h}>
          <line x1={x(h)} y1={pad} x2={x(h)} y2={H - pad} stroke="rgba(216,204,192,0.07)" />
          <text x={x(h)} y={H - 2} textAnchor="middle" fontSize="8" fill="var(--muted)" fontFamily="var(--font-mono)">
            {String(h).padStart(2, '0')}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#energy-fill)" />
      <path d={path} fill="none" stroke="var(--glow-track)" strokeWidth="1.5" />
      {nowHour >= 0 && nowHour <= 23 && (
        <line className="energy-now-line" x1={x(nowHour)} y1={pad} x2={x(nowHour)} y2={H - pad} />
      )}
      <circle cx={x(wakeHour % 24)} cy={H - pad} r="2.5" fill="var(--glow-attend)" />
    </svg>
  );
}

function SleepTrend({ trend, needMin }: { trend: HealthSummary['trend']; needMin: number }) {
  const W = 320;
  const H = 120;
  const pad = 14;
  const max = Math.max(needMin, ...trend.map((d) => d.sleepMinutes ?? 0)) * 1.1 || 600;
  const bw = (W - pad * 2) / Math.max(trend.length, 1);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sleep over the last 14 days">
      <line
        x1={pad} x2={W - pad}
        y1={H - pad - (needMin / max) * (H - pad * 2)}
        y2={H - pad - (needMin / max) * (H - pad * 2)}
        stroke="var(--glow-attend)" strokeDasharray="3 4" strokeOpacity="0.6"
      />
      {trend.map((d, i) => {
        const v = d.sleepMinutes ?? 0;
        const h = (v / max) * (H - pad * 2);
        const met = v >= needMin;
        return (
          <rect
            key={d.date}
            x={pad + i * bw + bw * 0.2}
            y={H - pad - h}
            width={bw * 0.6}
            height={Math.max(h, 1)}
            rx="2"
            fill={met ? 'var(--glow-track)' : 'rgba(199, 154, 107, 0.55)'}
            opacity={d.sleepMinutes == null ? 0.15 : 1}
          />
        );
      })}
    </svg>
  );
}

function SetupState() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/health/setup')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setToken(d?.token ?? null))
      .catch(() => setToken(null));
  }, []);

  return (
    <section className="body-await glass-pane reveal" aria-label="Body — awaiting health data">
      <div className="body-await-waveform" aria-hidden>
        ─────╱╲────╱╲─────
      </div>
      <h1>Awaiting biometrics</h1>
      <p>
        The ingestion endpoint is live. Point <strong>Health Auto Export</strong> at
        it (REST API export, JSON format) and this surface becomes your instrument
        panel — readiness, sleep debt, energy curve, trends. Baselines mature over
        ~30 days, so start pushing early.
      </p>
      <p>
        <code>POST /api/health/ingest</code> with header{' '}
        <code>Authorization: Bearer …</code>
      </p>
      <div className="token-row">
        <code style={{ wordBreak: 'break-all' }}>{token ?? 'generating token…'}</code>
        {token && (
          <button
            className="btn-glow"
            onClick={() => {
              void navigator.clipboard.writeText(token);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? '✓ copied' : 'copy token'}
          </button>
        )}
      </div>
    </section>
  );
}

export function BodyView() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health/summary')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(setSummary)
      .catch(() => setError("Couldn't load health data"));
  }, []);

  if (error) {
    return <p style={{ color: 'var(--glow-urgent)', fontSize: '0.8125rem' }}>{error}</p>;
  }

  if (!summary) {
    return (
      <div>
        <span className="skeleton" style={{ height: 24, width: 180, marginBottom: 16 }} />
        <span className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!summary.hasData) return <SetupState />;

  const { latest, baselines, trend, energy, wakeHour } = summary;
  const need = baselines?.sleepNeedMin ?? 480;

  const delta = (v: number | null | undefined, base: number | null | undefined, invert = false) => {
    if (v == null || base == null || base === 0) return null;
    const pct = ((v - base) / base) * 100;
    const dir = (invert ? -pct : pct) >= 1 ? 'up' : (invert ? -pct : pct) <= -1 ? 'down' : 'flat';
    return { dir, label: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% vs 30d` };
  };

  const tiles = [
    { label: 'last night', value: fmtMin(latest?.sleepMinutes), delta: delta(latest?.sleepMinutes, need) },
    { label: 'sleep debt', value: fmtMin(latest?.sleepDebtMin), delta: null },
    { label: 'hrv', value: `${fmt(latest?.hrvMs)} ms`, delta: delta(latest?.hrvMs, baselines?.hrvMs) },
    { label: 'resting hr', value: `${fmt(latest?.restingHr)} bpm`, delta: delta(latest?.restingHr, baselines?.restingHr, true) },
    { label: 'steps', value: fmt(latest?.steps), delta: null },
    { label: 'active energy', value: `${fmt(latest?.activeEnergy)} kcal`, delta: null },
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      <div className="surface-head reveal">
        <h1 className="surface-title">Body</h1>
        <span className="surface-stat">
          <span className="pulse-live" style={{ marginRight: 8 }} />
          {summary.sampleCount.toLocaleString()} samples since {summary.since} · day {latest?.date}
          {baselines && baselines.dataDays < 30 && ` · baselines maturing ${baselines.dataDays}/30d`}
        </span>
      </div>

      <section className="body-hero glass-pane reveal" style={{ ['--reveal-i' as string]: 1 }}>
        <ReadinessRing value={latest?.readiness ?? null} />
        <div className="body-tiles">
          {tiles.map((t, i) => (
            <div key={t.label} className="body-tile reveal" style={{ ['--reveal-i' as string]: i + 2 }}>
              <div className="tile-label">{t.label}</div>
              <div className="tile-value">{t.value}</div>
              {t.delta && <div className={`tile-delta ${t.delta.dir}`}>{t.delta.label}</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="body-charts">
        <section className="chart-pane glass-pane reveal" style={{ ['--reveal-i' as string]: 3 }}>
          <h2 className="section-label">Energy forecast</h2>
          <EnergyChart energy={energy} wakeHour={wakeHour} />
        </section>
        <section className="chart-pane glass-pane reveal" style={{ ['--reveal-i' as string]: 4 }}>
          <h2 className="section-label">
            Sleep · last 14 nights <span style={{ color: 'var(--muted)' }}>(need {fmtMin(need)})</span>
          </h2>
          <SleepTrend trend={trend} needMin={need} />
        </section>
      </div>
    </div>
  );
}
