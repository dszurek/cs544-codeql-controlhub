'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChatPanel, type Backend } from './ChatPanel';
import { PlusIcon } from './ChatIcon';

interface SessionSummary {
  id: string;
  uuid: string;
  backend: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export function ChatFullPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [backend, setBackend] = useState<Backend>('claude-code');

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // When a new session appears (after first message), refresh list so sidebar updates
  useEffect(() => {
    if (sessionId && !sessions.some((s) => s.id === sessionId)) {
      loadSessions();
    }
  }, [sessionId, sessions, loadSessions]);

  const groupedBackend = sessions.reduce<Record<string, SessionSummary[]>>((acc, s) => {
    const key = s.backend;
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        height: 'calc(100vh - 1rem)',
        gap: '0.75rem',
      }}
    >
      <aside
        style={{
          background: 'rgba(42, 47, 53, 0.55)',
          border: '1px solid rgba(216, 204, 192, 0.1)',
          borderRadius: '10px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={() => setSessionId(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.625rem',
            background: 'rgba(176, 122, 79, 0.2)',
            border: '1px solid rgba(176, 122, 79, 0.4)',
            borderRadius: '6px',
            color: 'var(--beige-light)',
            cursor: 'pointer',
            fontSize: '0.8125rem',
          }}
        >
          <PlusIcon size={14} />
          New chat
        </button>

        {Object.entries(groupedBackend).map(([key, list]) => (
          <div key={key} style={{ marginTop: '0.5rem' }}>
            <div
              style={{
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--leather-light)',
                marginBottom: '0.25rem',
                padding: '0 0.25rem',
              }}
            >
              {key === 'claude-code' ? 'Claude Code' : 'Home Assistant'}
            </div>
            {list.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '0.75rem', margin: '0.25rem' }}>
                No sessions yet.
              </p>
            )}
            {list
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((s) => {
                const isActive = s.id === sessionId;
                const label = s.title || new Date(s.createdAt).toLocaleString();
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setBackend(s.backend as Backend);
                      setSessionId(s.id);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.375rem 0.5rem',
                      background: isActive
                        ? 'rgba(176, 122, 79, 0.2)'
                        : 'transparent',
                      border: '1px solid',
                      borderColor: isActive
                        ? 'rgba(176, 122, 79, 0.4)'
                        : 'transparent',
                      borderRadius: '6px',
                      color: isActive ? 'var(--beige-light)' : 'var(--beige)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
          </div>
        ))}
      </aside>

      <main
        style={{
          border: '1px solid rgba(216, 204, 192, 0.1)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <ChatPanel
          sessionId={sessionId}
          backend={backend}
          onBackendChange={setBackend}
          onSessionChange={(id) => {
            setSessionId(id);
            loadSessions();
          }}
          showNewButton={false}
          height="100%"
        />
      </main>
    </div>
  );
}
