'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionRenderer } from './ActionCard';
import type { ControlhubAction } from '@/lib/chat/actions';

export type Backend = 'claude-code' | 'home-assistant';

export interface ChatMessageView {
  id: string;
  role: string;
  content: string;
  actions: ControlhubAction[] | null;
  createdAt: string;
}

interface ChatPanelProps {
  sessionId: string | null;
  backend: Backend;
  onBackendChange: (backend: Backend) => void;
  onSessionChange: (sessionId: string | null) => void;
  /** Extra controls rendered on the right of the header (e.g. expand-to-page, close). */
  headerExtras?: React.ReactNode;
  /** Height constraint for inline use. Defaults to 100vh. */
  height?: string;
  showNewButton?: boolean;
  /** Pre-fills the input on mount (e.g. "Ask Claude" from the command palette). */
  initialInput?: string;
}

export function ChatPanel({
  sessionId,
  backend,
  onBackendChange,
  onSessionChange,
  headerExtras,
  height = '100vh',
  showNewButton = true,
  initialInput,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState(initialInput ?? '');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    setLoadingHistory(true);
    fetch(`/api/chat?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(
          (data.messages ?? []).map((m: ChatMessageView) => ({
            ...m,
            actions: m.actions ?? null,
          })),
        );
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    const userMsg: ChatMessageView = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      actions: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, backend, sessionId }),
      });
      const data = await res.json();
      if (data.sessionId && data.sessionId !== sessionId) onSessionChange(data.sessionId);
      if (data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessageView]);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${data.error}`,
            actions: [],
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Network error: ${err instanceof Error ? err.message : String(err)}`,
          actions: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, backend, sessionId, onSessionChange]);

  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(28, 31, 35, 0.96)',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(216, 204, 192, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <select
          value={backend}
          onChange={(e) => {
            onBackendChange(e.target.value as Backend);
            onSessionChange(null);
          }}
          style={{
            background: 'rgba(42, 47, 53, 0.55)',
            border: '1px solid rgba(216, 204, 192, 0.15)',
            borderRadius: '6px',
            padding: '0.375rem 0.625rem',
            color: 'var(--beige-light)',
            fontSize: '0.8125rem',
            outline: 'none',
          }}
        >
          <option value="claude-code">Claude Code</option>
          <option value="home-assistant">Home Assistant</option>
        </select>
        {showNewButton && (
          <button
            onClick={() => onSessionChange(null)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(216, 204, 192, 0.15)',
              color: 'var(--leather-light)',
              borderRadius: '6px',
              padding: '0.375rem 0.625rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            New
          </button>
        )}
        {headerExtras && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>{headerExtras}</div>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        {loadingHistory && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>Loading…</div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '1rem' }}>
            {backend === 'claude-code'
              ? 'Ask about your tasks, emails, or calendar. I can create, update, and close items.'
              : 'Talk to Home Assistant. Control lights, scenes, and devices.'}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              marginBottom: '0.875rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                background:
                  m.role === 'user' ? 'rgba(176, 122, 79, 0.25)' : 'rgba(63, 99, 83, 0.25)',
                border: '1px solid rgba(216, 204, 192, 0.1)',
                color: 'var(--beige-light)',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
            {m.actions && m.actions.length > 0 && (
              <div style={{ width: '85%', marginTop: '0.125rem' }}>
                {m.actions.map((a, i) => (
                  <ActionRenderer key={i} action={a} />
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>Thinking…</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid rgba(216, 204, 192, 0.1)',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sending ? 'Please wait…' : 'Ask anything…'}
          disabled={sending}
          style={{
            flex: 1,
            background: 'rgba(42, 47, 53, 0.55)',
            border: '1px solid rgba(216, 204, 192, 0.15)',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            color: 'var(--beige-light)',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          style={{
            background: 'rgba(176, 122, 79, 0.25)',
            border: '1px solid rgba(176, 122, 79, 0.4)',
            color: 'var(--leather-light)',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            cursor: sending ? 'default' : 'pointer',
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
