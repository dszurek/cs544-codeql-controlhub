'use client';

import React, { useState } from 'react';

export interface EmailData {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  preview: string | null;
  isRead: boolean;
  receivedAt: string;
  source: string;
  aiTier?: string | null;
  aiSummary?: string | null;
}

interface EmailListProps {
  emails: EmailData[];
  selectedId: string | null;
  onSelect: (email: EmailData) => void;
}

export interface TierGroup {
  tier: string;
  label: string;
  glow: string | null;
  emails: EmailData[];
}

const TIER_ORDER: Array<{ tier: string; label: string; glow: string | null }> = [
  { tier: 'urgent', label: 'urgent', glow: 'var(--glow-urgent)' },
  { tier: 'reply', label: 'needs reply', glow: 'var(--glow-attend)' },
  { tier: 'fyi', label: 'fyi', glow: 'var(--glow-track)' },
  { tier: 'untriaged', label: 'untriaged', glow: null },
  { tier: 'noise', label: 'noise', glow: null },
];

/** Group + order emails by triage tier. Untriaged sits above noise. */
export function groupByTier(emails: EmailData[]): TierGroup[] {
  const buckets = new Map<string, EmailData[]>(TIER_ORDER.map((t) => [t.tier, []]));
  for (const e of emails) {
    const tier = e.aiTier && buckets.has(e.aiTier) ? e.aiTier : 'untriaged';
    buckets.get(tier)!.push(e);
  }
  return TIER_ORDER.map((t) => ({ ...t, emails: buckets.get(t.tier)! })).filter(
    (g) => g.emails.length > 0,
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Row({
  email,
  index,
  selected,
  onSelect,
}: {
  email: EmailData;
  index: number;
  selected: boolean;
  onSelect: (email: EmailData) => void;
}) {
  return (
    <div
      className={`stream-row reveal ${email.isRead ? 'read' : 'unread'}${selected ? ' selected' : ''}`}
      style={{ ['--reveal-i' as string]: Math.min(index, 10) }}
      onClick={() => onSelect(email)}
    >
      {!email.isRead && <span className="stream-dot" aria-label="Unread" />}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 2,
        }}
      >
        <span className="stream-sender">{email.senderName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {(email.source === 'outlook' || email.source === 'gmail') && (
            <span className={`stream-chip ${email.source}`}>{email.source}</span>
          )}
          <span className="stream-time">{relativeTime(email.receivedAt)}</span>
        </div>
      </div>
      <div className="stream-subject">{email.subject}</div>
      {email.aiSummary ? (
        <div className="stream-preview stream-summary">✦ {email.aiSummary}</div>
      ) : (
        email.preview && <div className="stream-preview">{email.preview}</div>
      )}
    </div>
  );
}

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  const [noiseOpen, setNoiseOpen] = useState(false);

  if (emails.length === 0) {
    return (
      <div className="tl-empty">
        <span className="readout">── all clear ──</span>
        Nothing in this stream.
      </div>
    );
  }

  const groups = groupByTier(emails);
  // No tiers assigned at all → flat list, no headers.
  const triaged = groups.some((g) => g.tier !== 'untriaged');
  if (!triaged) {
    return (
      <div>
        {emails.map((email, i) => (
          <Row key={email.id} email={email} index={i} selected={email.id === selectedId} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => {
        const collapsed = group.tier === 'noise' && !noiseOpen;
        return (
          <section key={group.tier}>
            <button
              className="stream-tier-head"
              style={group.glow ? ({ ['--glow' as string]: group.glow } as React.CSSProperties) : undefined}
              onClick={() => group.tier === 'noise' && setNoiseOpen((o) => !o)}
              aria-expanded={!collapsed}
              disabled={group.tier !== 'noise'}
            >
              <span className={group.glow ? 'glow-text' : undefined}>{group.label}</span>
              <span className="stream-tier-count">{group.emails.length}</span>
              {group.tier === 'noise' && <span className="stream-tier-toggle">{collapsed ? 'show' : 'hide'}</span>}
            </button>
            {!collapsed &&
              group.emails.map((email, i) => (
                <Row key={email.id} email={email} index={i} selected={email.id === selectedId} onSelect={onSelect} />
              ))}
          </section>
        );
      })}
    </div>
  );
}
