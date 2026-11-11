'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

interface Summary {
  configured: boolean;
  user?: string;
  pushCount?: number;
  recentCommits?: Array<{ repo: string; message: string; at: string }>;
  openPRs?: Array<{ title: string; url: string; repo: string; number: number }>;
  openPRCount?: number;
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--leather-light)',
  fontWeight: 600,
  margin: 0,
};

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.round((now - then) / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.round(diffHr / 24)}d`;
}

export function GitHubWidget() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/github/summary')
      .then((r) => r.json())
      .then((d: Summary) => setData(d))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <GlassCard>
        <h2 style={labelStyle}>GitHub</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Couldn&rsquo;t load
        </p>
      </GlassCard>
    );
  }

  if (!data) {
    return (
      <GlassCard>
        <h2 style={labelStyle}>GitHub</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Loading…</p>
      </GlassCard>
    );
  }

  if (!data.configured) {
    return (
      <GlassCard>
        <h2 style={labelStyle}>GitHub</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
          Add a personal access token and username in{' '}
          <Link href="/settings" style={{ color: 'var(--leather-light)' }}>
            settings
          </Link>{' '}
          to see your activity.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={labelStyle}>GitHub</h2>
        <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>@{data.user}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.75rem',
          marginTop: '0.75rem',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.5rem',
              color: 'var(--beige-light)',
              lineHeight: 1,
            }}
          >
            {data.pushCount ?? 0}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>recent commits</div>
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.5rem',
              color: 'var(--beige-light)',
              lineHeight: 1,
            }}
          >
            {data.openPRCount ?? 0}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>open PRs</div>
        </div>
      </div>

      {data.openPRs && data.openPRs.length > 0 && (
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(216, 204, 192,0.08)',
          }}
        >
          <div
            style={{
              fontSize: '0.625rem',
              color: 'var(--muted)',
              letterSpacing: '0.05em',
              marginBottom: '0.375rem',
            }}
          >
            Open PRs
          </div>
          {data.openPRs.slice(0, 3).map((pr) => (
            <a
              key={pr.url}
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '0.25rem 0',
                fontSize: '0.8125rem',
                color: 'var(--beige-light)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ color: 'var(--muted)', fontSize: '0.6875rem' }}>{pr.repo} · </span>
              {pr.title}
            </a>
          ))}
        </div>
      )}

      {data.recentCommits && data.recentCommits.length > 0 && (
        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(216, 204, 192,0.08)',
          }}
        >
          <div
            style={{
              fontSize: '0.625rem',
              color: 'var(--muted)',
              letterSpacing: '0.05em',
              marginBottom: '0.375rem',
            }}
          >
            Recent commits
          </div>
          {data.recentCommits.slice(0, 3).map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.25rem 0',
                fontSize: '0.75rem',
                color: 'var(--beige)',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                <span style={{ color: 'var(--muted)' }}>{c.repo.split('/')[1]} · </span>
                {c.message}
              </span>
              <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{formatRelative(c.at)}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
