'use client';

import { useEffect, useState } from 'react';
import { inputStyle } from './shared';

type EmailRule = {
  id: string;
  pattern: string;
  matchType: string;
  action: string;
  label: string | null;
};

export function EmailRulesManager() {
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [pattern, setPattern] = useState('');
  const [label, setLabel] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact' | 'regex'>('contains');
  const [action, setAction] = useState<'alert' | 'mute' | 'spam'>('alert');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mail/rules')
      .then((r) => r.json())
      .then((d: { rules: EmailRule[] }) => setRules(d.rules ?? []))
      .catch(() => setRules([]));
  }, []);

  async function handleAdd() {
    if (!pattern.trim()) {
      setError('Pattern required');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/mail/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: pattern.trim(),
          matchType,
          action,
          label: label.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const body = (await res.json()) as { rule: EmailRule };
      setRules([body.rule, ...rules]);
      setPattern('');
      setLabel('');
    } catch {
      setError('Failed to add rule');
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/mail/rules/${id}`, { method: 'DELETE' });
      if (res.ok) setRules(rules.filter((r) => r.id !== id));
    } catch {
      /* ignore */
    }
  }

  const smallButton: React.CSSProperties = {
    padding: '0.4375rem 1rem',
    background: 'rgba(176, 122, 79,0.25)',
    border: '1px solid rgba(176, 122, 79,0.4)',
    borderRadius: '6px',
    color: 'var(--leather-light)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  };

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Alert surfaces unread senders on the dashboard. Mute hides them. Spam moves matching
        messages to the Spam folder.
      </p>

      {rules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(42, 47, 53, 0.40)',
                border: '1px solid rgba(216, 204, 192,0.1)',
                borderRadius: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '4px',
                  background:
                    rule.action === 'alert'
                      ? 'rgba(220, 53, 69, 0.2)'
                      : rule.action === 'spam'
                      ? 'rgba(199, 154, 107, 0.2)'
                      : 'rgba(93, 93, 93, 0.2)',
                  color:
                    rule.action === 'alert'
                      ? '#dc3545'
                      : rule.action === 'spam'
                      ? 'var(--leather-light)'
                      : 'var(--muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {rule.action}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--beige-light)', fontSize: '0.8125rem' }}>
                  {rule.label ?? rule.pattern}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.6875rem' }}>
                  {rule.matchType}: {rule.pattern}
                </div>
              </div>
              <button
                onClick={() => handleRemove(rule.id)}
                aria-label={`Remove rule ${rule.pattern}`}
                style={{
                  background: 'none',
                  border: '1px solid rgba(220,53,69,0.4)',
                  color: '#dc3545',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          borderTop: rules.length > 0 ? '1px solid rgba(216, 204, 192,0.1)' : 'none',
          paddingTop: rules.length > 0 ? '1rem' : 0,
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <input
          aria-label="Sender pattern"
          placeholder="Sender (email, domain, or name)"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          style={inputStyle}
        />
        <input
          aria-label="Label"
          placeholder="Label (optional, e.g. Boss)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            aria-label="Match type"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as 'contains' | 'exact' | 'regex')}
            style={{ ...inputStyle, width: 'auto', flex: 1 }}
          >
            <option value="contains">contains</option>
            <option value="exact">exact</option>
            <option value="regex">regex</option>
          </select>
          <select
            aria-label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value as 'alert' | 'mute' | 'spam')}
            style={{ ...inputStyle, width: 'auto', flex: 1 }}
          >
            <option value="alert">alert</option>
            <option value="mute">mute</option>
            <option value="spam">spam</option>
          </select>
          <button onClick={handleAdd} style={smallButton}>
            Add rule
          </button>
        </div>
        {error && <p style={{ color: '#dc3545', fontSize: '0.75rem', margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}

