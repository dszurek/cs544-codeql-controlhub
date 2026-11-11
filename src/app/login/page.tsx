'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? 'Login failed');
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={logoStyle}>ControlHub</h1>
        <p style={subtitleStyle}>Enter your password to continue.</p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
            style={inputStyle}
          />

          {error && (
            <p role="alert" style={errorStyle}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Please wait…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Inline styles matching the app's earthy glassmorphism ── */

const containerStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#050505',
  backgroundImage: [
    'radial-gradient(ellipse at 20% 50%, rgba(63, 99, 83, 0.25) 0%, transparent 60%)',
    'radial-gradient(ellipse at 80% 20%, rgba(176, 122, 79, 0.18) 0%, transparent 55%)',
    'radial-gradient(ellipse at 50% 120%, rgba(199, 154, 107, 0.08) 0%, transparent 45%)',
  ].join(', '),
  padding: '1rem',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '380px',
  background: 'rgba(42, 47, 53, 0.50)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(216, 204, 192, 0.1)',
  borderRadius: '14px',
  padding: '2.5rem 2rem',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  animation: 'modal-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
};

const logoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-playfair)',
  fontSize: '1.75rem',
  background: 'linear-gradient(135deg, #efe7dd, #c79a6b, #5a8270)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '0.5rem',
};

const subtitleStyle: React.CSSProperties = {
  color: 'rgba(216, 204, 192, 0.5)',
  fontSize: '0.8125rem',
  textAlign: 'center',
  marginBottom: '1.5rem',
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192, 0.15)',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
  color: '#efe7dd',
  fontSize: '0.9375rem',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: '1rem',
};

const errorStyle: React.CSSProperties = {
  color: '#dc3545',
  fontSize: '0.8125rem',
  marginBottom: '1rem',
  textAlign: 'center',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: 'linear-gradient(135deg, rgba(176, 122, 79, 0.4), rgba(63, 99, 83, 0.4))',
  border: '1px solid rgba(199, 154, 107, 0.3)',
  borderRadius: '8px',
  color: '#efe7dd',
  fontSize: '0.875rem',
  fontWeight: 600,
  letterSpacing: '0.03em',
  transition: 'all 120ms cubic-bezier(0.2, 0.8, 0.2, 1)',
};
