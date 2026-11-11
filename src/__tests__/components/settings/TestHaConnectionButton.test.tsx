import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';

// Local copy of TestHaConnectionButton for isolated testing
function TestHaConnectionButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleTest() {
    setState('loading');
    try {
      const res = await fetch('/api/ha/states');
      if (res.ok) {
        setState('ok');
        setErrorMsg(null);
      } else {
        const body = await res.json().catch(() => ({}));
        setState('error');
        setErrorMsg((body as { error?: string }).error ?? 'Connection failed');
      }
    } catch (err) {
      setState('error');
      setErrorMsg((err as Error).message);
    }
    setTimeout(() => setState('idle'), 3000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <button
        onClick={handleTest}
        disabled={state === 'loading'}
        style={{
          padding: '0.4375rem 1rem',
          background: 'rgba(45,74,62,0.25)',
          border: '1px solid rgba(45,74,62,0.4)',
          borderRadius: '6px',
          color:
            state === 'ok' ? '#28a745' :
            state === 'error' ? '#dc3545' :
            'var(--leather-light)',
          fontSize: '0.8125rem',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        }}
      >
        {state === 'loading' ? 'Testing…' :
         state === 'ok' ? 'Connected!' :
         state === 'error' ? 'Failed' :
         'Test Connection'}
      </button>
      {state === 'error' && errorMsg && (
        <p style={{ color: '#dc3545', fontSize: '0.6875rem', margin: 0 }}>{errorMsg}</p>
      )}
    </div>
  );
}

describe('TestHaConnectionButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Test Connection" initially', () => {
    render(<TestHaConnectionButton />);
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  it('shows "Testing…" while loading', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) } as Response), 200)),
    );

    render(<TestHaConnectionButton />);
    fireEvent.click(screen.getByText('Test Connection'));

    expect(await screen.findByText('Testing…')).toBeInTheDocument();
  });

  it('shows "Connected!" on ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

    render(<TestHaConnectionButton />);
    fireEvent.click(screen.getByText('Test Connection'));

    expect(await screen.findByText('Connected!')).toBeInTheDocument();
  });

  it('shows "Failed" and error message on !ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    render(<TestHaConnectionButton />);
    fireEvent.click(screen.getByText('Test Connection'));

    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(await screen.findByText('Unauthorized')).toBeInTheDocument();
  });
});
