'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface Stats {
  completedByDay: Array<{ date: string; count: number }>;
  completedThisWeek: number;
  streak: number;
  overdue: number;
  dueThisWeek: number;
  totalPending: number;
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--leather-light)',
  fontWeight: 600,
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-playfair)',
  fontSize: '1.5rem',
  color: 'var(--beige-light)',
  lineHeight: 1,
};

function dayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
}

export function ProductivityWidget() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/tasks/stats')
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <GlassCard>
        <h2 style={labelStyle}>Productivity</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Couldn&rsquo;t load stats
        </p>
      </GlassCard>
    );
  }

  if (!stats) {
    return (
      <GlassCard>
        <h2 style={labelStyle}>Productivity</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Loading…</p>
      </GlassCard>
    );
  }

  const maxCount = Math.max(1, ...stats.completedByDay.map((d) => d.count));

  return (
    <GlassCard>
      <h2 style={{ ...labelStyle, margin: 0 }}>Productivity</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginTop: '0.75rem',
        }}
      >
        <div>
          <div style={valueStyle}>{stats.completedThisWeek}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>done this week</div>
        </div>
        <div>
          <div style={valueStyle}>{stats.streak}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>day streak</div>
        </div>
        <div>
          <div
            style={{
              ...valueStyle,
              color: stats.overdue > 0 ? '#dc3545' : 'var(--beige-light)',
            }}
          >
            {stats.overdue}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>overdue</div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div
          style={{
            fontSize: '0.625rem',
            color: 'var(--muted)',
            marginBottom: '0.25rem',
            letterSpacing: '0.05em',
          }}
        >
          Last 7 days
        </div>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'flex-end',
            height: '48px',
          }}
        >
          {stats.completedByDay.map((d) => {
            const pct = d.count === 0 ? 4 : (d.count / maxCount) * 100;
            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} completed`}
                style={{
                  flex: 1,
                  height: `${pct}%`,
                  minHeight: '4px',
                  background:
                    d.count > 0
                      ? 'rgba(199, 154, 107,0.7)'
                      : 'rgba(216, 204, 192,0.12)',
                  borderRadius: '3px 3px 0 0',
                  position: 'relative',
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginTop: '0.25rem',
            fontSize: '0.5625rem',
            color: 'var(--muted)',
            textAlign: 'center',
          }}
        >
          {stats.completedByDay.map((d) => (
            <div key={d.date} style={{ flex: 1 }}>
              {dayName(d.date)}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(216, 204, 192,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--muted)',
        }}
      >
        <span>
          <span style={{ color: 'var(--beige-light)' }}>{stats.dueThisWeek}</span> due this week
        </span>
        <span>
          <span style={{ color: 'var(--beige-light)' }}>{stats.totalPending}</span> pending total
        </span>
      </div>
    </GlassCard>
  );
}
