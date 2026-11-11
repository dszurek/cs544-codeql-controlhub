'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

type Briefing = {
  id: string;
  summary: string;
  priorityTaskIds: string[];
  priorityEmailIds: string[];
  model: string | null;
  error: string | null;
  createdAt: string;
};

function formatRelative(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderSummary(markdown: string): React.ReactElement[] {
  const lines = markdown.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (/^[-*]\s/.test(trimmed)) {
      return (
        <li key={i} style={{ fontSize: '0.8125rem', lineHeight: 1.55, marginLeft: '1rem' }}>
          {trimmed.replace(/^[-*]\s+/, '')}
        </li>
      );
    }
    if (/^#+\s/.test(trimmed)) {
      return (
        <div
          key={i}
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--leather-light)',
            marginTop: i === 0 ? 0 : '0.5rem',
          }}
        >
          {trimmed.replace(/^#+\s+/, '')}
        </div>
      );
    }
    return (
      <p
        key={i}
        style={{
          fontSize: '0.8125rem',
          lineHeight: 1.55,
          margin: 0,
          color: 'rgba(216, 204, 192,0.8)',
        }}
      >
        {trimmed}
      </p>
    );
  });
}

export function BriefingWidget() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch('/api/briefing/latest')
      .then((r) => r.json())
      .then((d: { briefing: Briefing | null }) => setBriefing(d.briefing))
      .catch(() => setBriefing(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleRun() {
    setRunning(true);
    try {
      await fetch('/api/briefing/run', { method: 'POST' });
      setTimeout(() => {
        fetch('/api/briefing/latest')
          .then((r) => r.json())
          .then((d: { briefing: Briefing | null }) => setBriefing(d.briefing))
          .catch(() => {})
          .finally(() => setRunning(false));
      }, 60000);
    } catch {
      setRunning(false);
    }
  }

  const headingRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  };

  return (
    <GlassCard>
      <div style={headingRow}>
        <h2
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '1rem',
            color: 'var(--beige-light)',
            margin: 0,
          }}
        >
          Briefing
        </h2>
        <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
          {briefing ? formatRelative(briefing.createdAt) : ''}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>Loading…</p>
      ) : briefing?.error ? (
        <p style={{ fontSize: '0.75rem', color: '#dc3545', margin: 0 }}>
          Last run errored: {briefing.error}
        </p>
      ) : !briefing ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
          No briefing yet. Run one manually or wait for the scheduled job.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
          {renderSummary(briefing.summary)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: '0.25rem 0.75rem',
            background: 'transparent',
            border: '1px solid rgba(216, 204, 192,0.2)',
            borderRadius: '4px',
            color: 'var(--leather-light)',
            fontSize: '0.6875rem',
            cursor: running ? 'not-allowed' : 'pointer',
            letterSpacing: '0.03em',
          }}
        >
          {running ? 'Running…' : 'Run now'}
        </button>
        {briefing && (briefing.priorityTaskIds.length > 0 || briefing.priorityEmailIds.length > 0) && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
            {briefing.priorityTaskIds.length} priority task
            {briefing.priorityTaskIds.length === 1 ? '' : 's'} · {briefing.priorityEmailIds.length}{' '}
            email{briefing.priorityEmailIds.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </GlassCard>
  );
}
