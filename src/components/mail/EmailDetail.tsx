'use client';

import React, { useState } from 'react';
import type { EmailData } from './EmailList';

interface EmailDetailProps {
  email: EmailData | null;
  onMarkRead: (id: string, isRead: boolean) => void;
}

const SOURCE_BADGE: Record<string, { bg: string; label: string }> = {
  outlook: { bg: '#0078d4', label: 'Outlook' },
  gmail: { bg: '#ea4335', label: 'Gmail' },
};

export function EmailDetail({ email, onMarkRead }: EmailDetailProps) {
  if (!email) {
    return (
      <div style={{ padding: '1rem' }}>
        <p style={{ color: 'var(--muted)' }}>Select an email to read it</p>
      </div>
    );
  }

  const badge = SOURCE_BADGE[email.source];

  async function handleMarkRead() {
    const newIsRead = !email!.isRead;
    onMarkRead(email!.id, newIsRead);
    try {
      await fetch(`/api/mail/${email!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: newIsRead }),
      });
    } catch {
      // best-effort; optimistic update already applied
    }
  }

  const receivedDate = new Date(email.receivedAt);
  const dateStr = receivedDate.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = receivedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const headerStyle: React.CSSProperties = {
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(216, 204, 192,0.08)',
  };

  const subjectStyle: React.CSSProperties = {
    fontFamily: 'var(--font-playfair)',
    fontSize: '1.125rem',
    color: 'var(--beige-light)',
    marginBottom: '0.5rem',
    lineHeight: 1.3,
  };

  const senderStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--beige)',
    marginBottom: '0.25rem',
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'rgba(216, 204, 192,0.5)',
  };

  const badgeStyle: React.CSSProperties = badge
    ? {
        display: 'inline-block',
        background: badge.bg,
        color: '#fff',
        borderRadius: '10px',
        padding: '1px 6px',
        fontSize: '0.6875rem',
      }
    : {};

  const markBtnStyle: React.CSSProperties = {
    padding: '4px 12px',
    background: 'rgba(176, 122, 79,0.2)',
    border: '1px solid rgba(176, 122, 79,0.4)',
    color: 'var(--leather-light)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    marginBottom: '1rem',
  };

  const previewBoxStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    background: 'rgba(42, 47, 53, 0.40)',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: 'var(--beige)',
    whiteSpace: 'pre-wrap',
  };

  const noteStyle: React.CSSProperties = {
    marginTop: '0.75rem',
    fontSize: '0.75rem',
    color: 'rgba(216, 204, 192,0.4)',
    fontStyle: 'italic',
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={headerStyle}>
        <div style={subjectStyle}>{email.subject}</div>
        <div style={senderStyle}>
          {email.senderName}{' '}
          <span style={{ color: 'rgba(216, 204, 192,0.5)' }}>&lt;{email.senderEmail}&gt;</span>
        </div>
        <div style={metaStyle}>
          {badge && <span style={badgeStyle}>{badge.label}</span>}
          <span>
            {dateStr} at {timeStr}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button style={{ ...markBtnStyle, marginBottom: 0 }} onClick={handleMarkRead}>
          {email.isRead ? 'Mark as unread' : 'Mark as read'}
        </button>
        <AddToCalendarButton email={email} />
        <button
          className="btn-glow"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent('controlhub:open-copilot', {
                detail: {
                  prompt:
                    `Draft a reply in my voice to this email. Keep it natural and brief; ` +
                    `give me the draft text only so I can copy it.\n\n` +
                    `From: ${email.senderName} <${email.senderEmail}>\n` +
                    `Subject: ${email.subject}\n` +
                    `Preview: ${email.preview ?? '(no preview)'}`,
                },
              }),
            );
          }}
        >
          ✦ Draft reply
        </button>
        <a
          className="btn-glow"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          href={`mailto:${email.senderEmail}?subject=${encodeURIComponent(`Re: ${email.subject}`)}`}
        >
          ↩ Open mail app
        </a>
      </div>

      {email.preview ? (
        <div style={previewBoxStyle}>{email.preview}</div>
      ) : (
        <div style={previewBoxStyle} aria-label="No preview available">
          <span style={{ color: 'rgba(216, 204, 192,0.4)' }}>(No preview available)</span>
        </div>
      )}

      <p style={noteStyle}>Full message body not stored — preview only</p>
    </div>
  );
}

function AddToCalendarButton({ email }: { email: EmailData }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(email.subject || '');
  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  defaultStart.setHours(defaultStart.getHours() + 1);
  const toLocalInput = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const [startAt, setStartAt] = useState(toLocalInput(defaultStart));
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  async function submit() {
    setState('saving');
    try {
      const start = new Date(startAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const res = await fetch(`/api/mail/${email.id}/link-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || email.subject || '(untitled)',
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
    setTimeout(() => {
      setState('idle');
      setOpen(false);
    }, 1500);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '4px 12px',
          background: 'rgba(45,74,62,0.2)',
          border: '1px solid rgba(45,74,62,0.5)',
          color: '#6a9a82',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.8125rem',
        }}
      >
        Add to calendar
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.375rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '0.5rem',
        borderRadius: '6px',
        border: '1px solid rgba(45,74,62,0.5)',
        background: 'rgba(45,74,62,0.1)',
      }}
    >
      <input
        aria-label="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          background: 'rgba(42, 47, 53, 0.55)',
          border: '1px solid rgba(216, 204, 192,0.15)',
          borderRadius: '4px',
          padding: '0.25rem 0.5rem',
          color: 'var(--beige-light)',
          fontSize: '0.8125rem',
          minWidth: '10rem',
        }}
      />
      <input
        type="datetime-local"
        aria-label="Start"
        value={startAt}
        onChange={(e) => setStartAt(e.target.value)}
        style={{
          background: 'rgba(42, 47, 53, 0.55)',
          border: '1px solid rgba(216, 204, 192,0.15)',
          borderRadius: '4px',
          padding: '0.25rem 0.5rem',
          color: 'var(--beige-light)',
          fontSize: '0.8125rem',
        }}
      />
      <button
        onClick={submit}
        disabled={state === 'saving'}
        style={{
          padding: '4px 10px',
          background: 'rgba(45,74,62,0.3)',
          border: '1px solid rgba(45,74,62,0.5)',
          color: state === 'done' ? '#28a745' : state === 'error' ? '#dc3545' : '#6a9a82',
          borderRadius: '4px',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        {state === 'saving'
          ? 'Saving…'
          : state === 'done'
            ? 'Added!'
            : state === 'error'
              ? 'Error'
              : 'Add'}
      </button>
      <button
        onClick={() => setOpen(false)}
        style={{
          padding: '4px 10px',
          background: 'none',
          border: '1px solid rgba(216, 204, 192,0.15)',
          color: 'var(--muted)',
          borderRadius: '4px',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}
