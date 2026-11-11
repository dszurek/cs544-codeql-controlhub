'use client';

import { useEffect, useState } from 'react';
import { inputStyle } from './shared';

type EmailAccount = {
  id: string;
  provider: string;
  email: string;
  label: string | null;
  enabled: boolean;
};

export function EmailAccountsManager() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [max, setMax] = useState(10);
  const [provider, setProvider] = useState<'outlook' | 'gmail'>('outlook');
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/email-accounts')
      .then((r) => r.json())
      .then((d: { accounts: EmailAccount[]; max: number }) => {
        setAccounts(d.accounts ?? []);
        if (typeof d.max === 'number') setMax(d.max);
      })
      .catch(() => setAccounts([]));
  }, []);

  async function handleAdd() {
    if (!email.trim()) {
      setError('Email required');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: email.trim(),
          label: label.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? 'Failed to add account');
        return;
      }
      const body = (await res.json()) as { account: EmailAccount };
      setAccounts([...accounts, body.account]);
      setEmail('');
      setLabel('');
    } catch {
      setError('Failed to add account');
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/email-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { account: EmailAccount };
      setAccounts(accounts.map((a) => (a.id === id ? body.account : a)));
    } catch {
      /* ignore */
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/email-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) setAccounts(accounts.filter((a) => a.id !== id));
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

  const atLimit = accounts.length >= max;

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Register up to {max} email accounts. OAuth per-account sign-in is set up in the provider
        section above; this list tracks which addresses are active.
      </p>

      {accounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(42, 47, 53, 0.40)',
                border: '1px solid rgba(216, 204, 192,0.1)',
                borderRadius: '6px',
                opacity: acc.enabled ? 1 : 0.5,
              }}
            >
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '4px',
                  background:
                    acc.provider === 'outlook'
                      ? 'rgba(0, 120, 212, 0.2)'
                      : 'rgba(234, 67, 53, 0.2)',
                  color: acc.provider === 'outlook' ? '#4aa3e0' : '#ea4335',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {acc.provider}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--beige-light)', fontSize: '0.8125rem' }}>
                  {acc.label ?? acc.email}
                </div>
                {acc.label && (
                  <div style={{ color: 'var(--muted)', fontSize: '0.6875rem' }}>{acc.email}</div>
                )}
              </div>
              <button
                onClick={() => handleToggle(acc.id, !acc.enabled)}
                aria-label={`${acc.enabled ? 'Disable' : 'Enable'} ${acc.email}`}
                style={{
                  background: 'none',
                  border: '1px solid rgba(216, 204, 192,0.25)',
                  color: 'var(--leather-light)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                {acc.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleRemove(acc.id)}
                aria-label={`Remove ${acc.email}`}
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
          borderTop: accounts.length > 0 ? '1px solid rgba(216, 204, 192,0.1)' : 'none',
          paddingTop: accounts.length > 0 ? '1rem' : 0,
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            aria-label="Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'outlook' | 'gmail')}
            style={{ ...inputStyle, width: 'auto', flex: '0 0 120px' }}
          >
            <option value="outlook">outlook</option>
            <option value="gmail">gmail</option>
          </select>
          <input
            aria-label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
          />
        </div>
        <input
          aria-label="Label"
          placeholder="Label (optional, e.g. Personal)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleAdd} disabled={atLimit} style={{ ...smallButton, opacity: atLimit ? 0.5 : 1, cursor: atLimit ? 'not-allowed' : 'pointer' }}>
          {atLimit ? `Max ${max} reached` : 'Add account'}
        </button>
        {error && <p style={{ color: '#dc3545', fontSize: '0.75rem', margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}

