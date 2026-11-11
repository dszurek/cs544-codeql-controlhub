'use client';

import { useEffect, useState } from 'react';

export interface CalendarEventData {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  source: string;
  calendarName: string;
  color: string | null;
}

interface EventDetailProps {
  event: CalendarEventData | null;
  onClose: () => void;
}

function formatEventTime(startAt: string, endAt: string, allDay: boolean): string {
  if (allDay) return 'All day';
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (start.toDateString() === end.toDateString()) {
    return `${start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmt(start)} – ${fmt(end)}`;
  }
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
}

const SOURCE_BADGE_COLORS: Record<string, string> = {
  outlook: '#0078d4',
  icloud: '#555555',
};

export function EventDetail({ event, onClose }: EventDetailProps) {
  if (!event) return null;

  const badgeColor = event.color ?? SOURCE_BADGE_COLORS[event.source] ?? '#b07a4f';

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 'min(360px, 100vw)',
        background: 'rgba(28, 31, 35, 0.95)',
        borderLeft: '1px solid rgba(216, 204, 192,0.15)',
        padding: '1.5rem',
        zIndex: 100,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
        }}
      >
        <h2
          style={{
            color: 'var(--beige-light)',
            fontSize: '1.125rem',
            fontWeight: 600,
            margin: 0,
            flex: 1,
            paddingRight: '1rem',
          }}
        >
          {event.title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--beige)',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Date/time */}
      <p
        style={{
          color: 'var(--beige)',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}
      >
        {formatEventTime(event.startAt, event.endAt, event.allDay)}
      </p>

      {/* Source badge */}
      <div style={{ marginBottom: '1rem' }}>
        <span
          style={{
            display: 'inline-block',
            background: badgeColor,
            color: 'white',
            fontSize: '0.6875rem',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: 500,
            textTransform: 'capitalize',
          }}
        >
          {event.source}
        </span>
      </div>

      {/* Calendar name */}
      <p
        style={{
          color: 'rgba(216, 204, 192,0.5)',
          fontSize: '0.8125rem',
          marginBottom: event.location ? '0.75rem' : 0,
        }}
      >
        {event.calendarName}
      </p>

      {/* Location */}
      {event.location && (
        <p
          style={{
            color: 'var(--beige)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.4rem',
          }}
        >
          <span style={{ opacity: 0.6 }}>📍</span>
          {event.location}
        </p>
      )}

      <LinkedEmails eventId={event.id} />
    </div>
  );
}

interface LinkedEmail {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  source: string;
  receivedAt: string;
}

function LinkedEmails({ eventId }: { eventId: string }) {
  const [emails, setEmails] = useState<LinkedEmail[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEmails(null);
    fetch(`/api/calendar/${eventId}/linked-emails`)
      .then((r) => (r.ok ? r.json() : { emails: [] }))
      .then((data) => {
        if (!cancelled) setEmails(data.emails ?? []);
      })
      .catch(() => {
        if (!cancelled) setEmails([]);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!emails || emails.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(216, 204, 192,0.1)',
      }}
    >
      <h3
        style={{
          color: 'var(--beige-light)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          margin: '0 0 0.5rem 0',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Linked emails
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
        {emails.map((em) => (
          <li
            key={em.id}
            style={{
              padding: '0.5rem 0.625rem',
              background: 'rgba(42, 47, 53, 0.40)',
              border: '1px solid rgba(216, 204, 192,0.08)',
              borderRadius: '6px',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ color: 'var(--beige-light)', marginBottom: '0.125rem' }}>
              {em.subject || '(no subject)'}
            </div>
            <div style={{ color: 'rgba(216, 204, 192,0.5)', fontSize: '0.75rem' }}>
              {em.senderName || em.senderEmail} ·{' '}
              {new Date(em.receivedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
