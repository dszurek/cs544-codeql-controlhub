'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ControlhubAction } from '@/lib/chat/actions';

interface Task {
  id: string;
  title: string;
  priority: number;
  status: string;
  dueDate: string | null;
}
interface Email {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  receivedAt: string;
  isRead: boolean;
}
interface Event {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  source: string;
}

function priorityColor(p: number): string {
  if (p === 1) return '#dc3545';
  if (p === 2) return '#ff8c00';
  if (p === 3) return 'var(--leather-light)';
  return 'var(--muted)';
}

const baseCard: React.CSSProperties = {
  display: 'block',
  padding: '0.5rem 0.75rem',
  border: '1px solid rgba(216, 204, 192, 0.15)',
  borderRadius: '6px',
  background: 'rgba(42, 47, 53, 0.40)',
  color: 'var(--beige-light)',
  textDecoration: 'none',
  fontSize: '0.8125rem',
  marginTop: '0.5rem',
};

function TaskCard({ id }: { id: string }) {
  const [task, setTask] = useState<Task | null>(null);
  useEffect(() => {
    fetch(`/api/tasks?view=all`)
      .then((r) => r.json())
      .then((d) => {
        const found = (d.tasks as Task[])?.find((t) => t.id === id);
        setTask(found ?? null);
      })
      .catch(() => setTask(null));
  }, [id]);
  if (!task)
    return (
      <div style={{ ...baseCard, color: 'var(--muted)' }}>Task {id.slice(0, 8)}…</div>
    );
  return (
    <Link href="/tasks" style={baseCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            fontSize: '0.625rem',
            padding: '0.125rem 0.375rem',
            borderRadius: '4px',
            background: `${priorityColor(task.priority)}22`,
            color: priorityColor(task.priority),
            fontWeight: 600,
          }}
        >
          P{task.priority}
        </span>
        <span
          style={{
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
            opacity: task.status === 'completed' ? 0.6 : 1,
          }}
        >
          {task.title}
        </span>
      </div>
    </Link>
  );
}

function EmailCard({ id }: { id: string }) {
  const [email, setEmail] = useState<Email | null>(null);
  useEffect(() => {
    fetch('/api/mail')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.emails as Email[])?.find((e) => e.id === id);
        setEmail(found ?? null);
      })
      .catch(() => setEmail(null));
  }, [id]);
  if (!email)
    return (
      <div style={{ ...baseCard, color: 'var(--muted)' }}>Email {id.slice(0, 8)}…</div>
    );
  return (
    <Link href="/mail" style={baseCard}>
      <div
        style={{
          fontWeight: email.isRead ? 400 : 600,
          color: email.isRead ? 'var(--beige)' : 'var(--beige-light)',
        }}
      >
        {email.subject || '(no subject)'}
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
        {email.senderName || email.senderEmail}
      </div>
    </Link>
  );
}

function EventCard({ id }: { id: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  useEffect(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const end = new Date();
    end.setDate(end.getDate() + 90);
    fetch(
      `/api/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
    )
      .then((r) => r.json())
      .then((d) => {
        const found = (d.events as Event[])?.find((e) => e.id === id);
        setEvent(found ?? null);
      })
      .catch(() => setEvent(null));
  }, [id]);
  if (!event)
    return (
      <div style={{ ...baseCard, color: 'var(--muted)' }}>Event {id.slice(0, 8)}…</div>
    );
  const when = new Date(event.startAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <Link href="/calendar" style={baseCard}>
      <div style={{ fontWeight: 500 }}>{event.title}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
        {when}
      </div>
    </Link>
  );
}

export function ActionRenderer({ action }: { action: ControlhubAction }) {
  switch (action.type) {
    case 'task_card':
      return typeof action.id === 'string' ? <TaskCard id={action.id} /> : null;
    case 'email_card':
      return typeof action.id === 'string' ? <EmailCard id={action.id} /> : null;
    case 'event_card':
      return typeof action.id === 'string' ? <EventCard id={action.id} /> : null;
    case 'task_list':
      return Array.isArray(action.ids) ? (
        <div>
          {(action.ids as string[]).map((id) => (
            <TaskCard key={id} id={id} />
          ))}
        </div>
      ) : null;
    case 'email_list':
      return Array.isArray(action.ids) ? (
        <div>
          {(action.ids as string[]).map((id) => (
            <EmailCard key={id} id={id} />
          ))}
        </div>
      ) : null;
    default:
      return null;
  }
}
