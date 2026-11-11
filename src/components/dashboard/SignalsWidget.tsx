'use client';

import { useEffect, useState } from 'react';

interface Signal {
  id: string;
  kind: string;
  title: string;
  body: string;
  glow: 'track' | 'attend' | 'urgent' | string;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  briefing: 'briefing',
  weekly_review: 'weekly review',
  health_insight: 'body',
  system: 'system',
};

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/** The Cortex output stream: every AI-generated insight lands here. */
export function SignalsWidget() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch('/api/signals')
        .then((r) => (r.ok ? r.json() : { signals: [] }))
        .then((d) => {
          if (!cancelled) setSignals(d.signals ?? []);
        })
        .catch(() => { /* feed is best-effort */ });
    load();
    const id = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function dismiss(id: string) {
    setSignals((prev) => prev.filter((s) => s.id !== id));
    fetch(`/api/signals/${id}`, { method: 'PATCH' }).catch(() => { /* refetched next poll */ });
  }

  if (signals.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {signals.slice(0, 5).map((s, i) => (
        <div
          key={s.id}
          className={`signal-card glow-${s.glow} reveal`}
          style={{ ['--reveal-i' as string]: i }}
        >
          <div className="signal-head">
            <span className="signal-kind">{KIND_LABEL[s.kind] ?? s.kind}</span>
            <span className="signal-time">{relativeTime(s.createdAt)}</span>
            <button className="signal-dismiss" aria-label="Dismiss" onClick={() => dismiss(s.id)}>
              ✕
            </button>
          </div>
          <div className="signal-title">{s.title}</div>
          <div
            className={`signal-body${expanded === s.id ? ' expanded' : ''}`}
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          >
            {s.body}
          </div>
        </div>
      ))}
    </div>
  );
}
