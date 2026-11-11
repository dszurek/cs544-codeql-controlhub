'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmailList } from './EmailList';
import { EmailDetail } from './EmailDetail';
import { TriageModal } from './TriageModal';
import type { EmailData } from './EmailList';

type Source = 'all' | 'outlook' | 'gmail';
type Folder = 'inbox' | 'spam';

const SOURCE_TABS: { id: Source; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'outlook', label: 'Outlook' },
  { id: 'gmail', label: 'Gmail' },
];

const FOLDER_TABS: { id: Folder; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'spam', label: 'Spam' },
];

interface UnreadCounts {
  outlook: number;
  gmail: number;
  total: number;
}

export function MailView() {
  const [source, setSource] = useState<Source>('all');
  const [folder, setFolder] = useState<Folder>('inbox');
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ outlook: 0, gmail: 0, total: 0 });
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);

  const loadEmails = useCallback(() => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (source !== 'all') params.set('source', source);
    if (folder === 'spam') params.set('folder', 'spam');

    fetch(`/api/mail${params.toString() ? `?${params.toString()}` : ''}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setEmails(data.emails ?? []);
        if (data.unreadCounts) setUnreadCounts(data.unreadCounts);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Failed to load emails.');
      })
      .finally(() => setLoading(false));

    return controller;
  }, [source, folder]);

  useEffect(() => {
    const controller = loadEmails();
    return () => controller.abort();
  }, [loadEmails]);

  function handleSelect(email: EmailData) {
    setSelectedEmail(email);
  }

  function handleMarkRead(id: string, isRead: boolean) {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isRead } : e))
    );
    setSelectedEmail((prev) => (prev?.id === id ? { ...prev, isRead } : prev));
  }

  function getUnreadForSource(src: Source): number {
    if (src === 'all') return unreadCounts.total;
    return unreadCounts[src] ?? 0;
  }

  return (
    <div>
      <div className="surface-head reveal">
        <h1 className="surface-title">Streams</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <span className="surface-stat">
            {unreadCounts.total > 0 && <span className="pulse-live" style={{ marginRight: 8 }} />}
            {unreadCounts.total} unread · {unreadCounts.outlook} outlook · {unreadCounts.gmail} gmail
          </span>
          <button
            className="btn-glow"
            onClick={() => setTriageOpen(true)}
            disabled={unreadCounts.total === 0}
            title="Let Claude classify unread emails"
          >
            ⚡ Triage inbox
          </button>
        </div>
      </div>

      <div className="surface-tabs reveal" style={{ ['--reveal-i' as string]: 1 }}>
        {SOURCE_TABS.map((tab) => {
          const count = getUnreadForSource(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => setSource(tab.id)}
              className={`surface-tab${source === tab.id ? ' active' : ''}`}
            >
              {tab.label}
              {count > 0 && <span className="tab-badge">{count}</span>}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', paddingBottom: '0.375rem' }}>
          {FOLDER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFolder(tab.id)}
              className={`pill${folder === tab.id ? ' active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--glow-urgent)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="stream-panels">
          <div className="stream-list glass-pane" style={{ padding: '1rem' }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton" style={{ height: 52, marginBottom: 10 }} />
            ))}
          </div>
          <div className="stream-detail glass-pane" style={{ padding: '1rem' }}>
            <span className="skeleton" style={{ height: 18, width: '55%', marginBottom: 14 }} />
            <span className="skeleton" style={{ height: 120 }} />
          </div>
        </div>
      ) : (
        <div className="stream-panels">
          <div className="stream-list glass-pane reveal" style={{ ['--reveal-i' as string]: 2 }}>
            <EmailList
              emails={emails}
              selectedId={selectedEmail?.id ?? null}
              onSelect={handleSelect}
            />
          </div>
          <div className="stream-detail glass-pane reveal" style={{ ['--reveal-i' as string]: 3 }}>
            <EmailDetail email={selectedEmail} onMarkRead={handleMarkRead} />
          </div>
        </div>
      )}

      <TriageModal
        emails={emails.filter((e) => !e.isRead)}
        open={triageOpen}
        onClose={() => setTriageOpen(false)}
        onApplied={() => loadEmails()}
      />
    </div>
  );
}
