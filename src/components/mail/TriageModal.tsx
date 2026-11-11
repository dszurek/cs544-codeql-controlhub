'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

type Category = 'reply' | 'task' | 'archive' | 'spam';

interface TriageItem {
  id: string;
  category: Category;
  reason: string;
  suggestedTask?: string;
}

interface EmailSummary {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
}

interface TriageModalProps {
  emails: EmailSummary[];
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

const CATEGORY_STYLES: Record<Category, { color: string; bg: string; label: string }> = {
  reply: { color: '#ffb347', bg: 'rgba(255,179,71,0.1)', label: 'Reply' },
  task: { color: '#8fbc8f', bg: 'rgba(143,188,143,0.1)', label: 'Task' },
  archive: { color: 'var(--muted)', bg: 'rgba(216, 204, 192,0.05)', label: 'Archive' },
  spam: { color: '#f1aeb5', bg: 'rgba(220,53,69,0.1)', label: 'Spam' },
};

export function TriageModal({ emails, open, onClose, onApplied }: TriageModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TriageItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  async function runTriage() {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const r = await fetch('/api/mail/triage', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? 'Triage failed');
      } else {
        setItems(j.items ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Triage failed');
    } finally {
      setLoading(false);
    }
  }

  function updateCategory(id: string, category: Category) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, category } : it)));
  }

  async function applyAll() {
    setApplying(true);
    try {
      for (const it of items) {
        if (it.category === 'archive' || it.category === 'spam') {
          await fetch(`/api/mail/${it.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          }).catch(() => {});
        } else if (it.category === 'task' && it.suggestedTask) {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: it.suggestedTask, source: 'triage' }),
          }).catch(() => {});
          await fetch(`/api/mail/${it.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          }).catch(() => {});
        }
        // "reply" → leave unread so user sees it
      }
      toast.success('Triage applied');
      onApplied?.();
      onClose();
    } catch {
      toast.error('Some actions failed');
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  const emailMap = new Map(emails.map((e) => [e.id, e]));

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-label="Inbox triage"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '1.5rem', maxWidth: 720, maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.25rem',
              color: 'var(--beige-light)',
              margin: 0,
              fontWeight: 400,
            }}
          >
            Inbox triage
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.25rem 0.5rem',
            }}
          >
            ×
          </button>
        </div>

        {items.length === 0 && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              Claude will classify up to 25 unread emails. Estimated 30-60 seconds.
            </p>
            <button
              onClick={runTriage}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(176, 122, 79,0.3)',
                border: '1px solid rgba(176, 122, 79,0.55)',
                color: 'var(--beige-light)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
              }}
            >
              Run triage
            </button>
          </div>
        )}

        {loading && (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem 0' }}>
            Thinking…
          </p>
        )}

        {error && (
          <p style={{ color: '#dc3545', fontSize: '0.8125rem' }}>{error}</p>
        )}

        {items.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {items.map((it) => {
                const email = emailMap.get(it.id);
                const style = CATEGORY_STYLES[it.category];
                return (
                  <div
                    key={it.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '0.5rem',
                      padding: '0.625rem 0.75rem',
                      background: style.bg,
                      border: '1px solid rgba(216, 204, 192,0.1)',
                      borderLeft: `3px solid ${style.color}`,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: 'var(--beige-light)',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {email?.subject ?? '(unknown)'}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.6875rem', marginTop: 2 }}>
                        {email?.senderName || email?.senderEmail || ''}
                      </div>
                      <div style={{ color: style.color, fontSize: '0.6875rem', marginTop: 4, fontStyle: 'italic' }}>
                        {it.reason}
                      </div>
                      {it.category === 'task' && it.suggestedTask && (
                        <div style={{ color: 'var(--beige-light)', fontSize: '0.75rem', marginTop: 4 }}>
                          → {it.suggestedTask}
                        </div>
                      )}
                    </div>
                    <select
                      value={it.category}
                      onChange={(e) => updateCategory(it.id, e.target.value as Category)}
                      style={{
                        background: 'rgba(34, 38, 43, 0.75)',
                        border: '1px solid rgba(216, 204, 192,0.15)',
                        color: 'var(--beige-light)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.6875rem',
                        padding: '2px 4px',
                        alignSelf: 'start',
                      }}
                    >
                      <option value="reply">Reply</option>
                      <option value="task">Task</option>
                      <option value="archive">Archive</option>
                      <option value="spam">Spam</option>
                    </select>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
                Archive/spam/task marks as read. Reply keeps unread.
              </span>
              <button
                onClick={applyAll}
                disabled={applying}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(176, 122, 79,0.3)',
                  border: '1px solid rgba(176, 122, 79,0.55)',
                  color: 'var(--beige-light)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: applying ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                {applying ? 'Applying…' : 'Apply all'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
