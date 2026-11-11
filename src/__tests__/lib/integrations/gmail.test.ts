import {
  getValidAccessToken,
  buildAuthUrl,
  handleCallback,
  sync,
} from '@/lib/integrations/gmail';

vi.mock('@/lib/settings', () => ({
  getSetting: vi.fn(),
  getSettings: vi.fn(),
  setSetting: vi.fn(),
}));

vi.mock('@/lib/mail', () => ({
  upsertEmail: vi.fn(),
}));

vi.mock('@/lib/syncLog', () => ({
  logSync: vi.fn(),
}));

import { getSettings, setSetting } from '@/lib/settings';
import { upsertEmail } from '@/lib/mail';
import { logSync } from '@/lib/syncLog';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── getValidAccessToken ───────────────────────────────────────────────────────

describe('getValidAccessToken', () => {
  it('returns null when no access token in settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      gmail_access_token: null,
      gmail_refresh_token: null,
      gmail_token_expiry: null,
    });

    const result = await getValidAccessToken();
    expect(result).toBeNull();
  });

  it('returns cached token when expiry is more than 60s away', async () => {
    const futureExpiry = String(Date.now() + 10 * 60 * 1000); // 10 minutes away
    vi.mocked(getSettings).mockResolvedValue({
      gmail_access_token: 'valid-token',
      gmail_refresh_token: 'refresh-token',
      gmail_token_expiry: futureExpiry,
    });

    const result = await getValidAccessToken();
    expect(result).toBe('valid-token');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls refreshAccessToken when token is expired', async () => {
    const pastExpiry = String(Date.now() - 1000); // already expired
    vi.mocked(getSettings)
      .mockResolvedValueOnce({
        // First call: getValidAccessToken loads token info
        gmail_access_token: 'old-token',
        gmail_refresh_token: 'refresh-token',
        gmail_token_expiry: pastExpiry,
      })
      .mockResolvedValueOnce({
        // Second call: refreshAccessToken loads refresh creds
        gmail_refresh_token: 'refresh-token',
        gmail_client_id: 'client-id',
        gmail_client_secret: 'client-secret',
      });

    vi.mocked(setSetting).mockResolvedValue(undefined);

    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-token',
        expires_in: 3600,
      }),
    });

    const result = await getValidAccessToken();
    expect(result).toBe('new-token');
    expect(fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(setSetting).toHaveBeenCalledWith('gmail_access_token', 'new-token');
  });
});

// ─── buildAuthUrl ──────────────────────────────────────────────────────────────

describe('buildAuthUrl', () => {
  it('returns a URL string containing accounts.google.com and the client_id', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      gmail_client_id: 'my-client-id',
      gmail_redirect_uri: 'http://localhost:3000/api/auth/gmail/callback',
    });

    const url = await buildAuthUrl();

    expect(url).toContain('accounts.google.com');
    expect(url).toContain('my-client-id');
    expect(url).toContain('gmail.readonly');
  });
});

// ─── handleCallback ────────────────────────────────────────────────────────────

describe('handleCallback', () => {
  it('calls fetch with the token endpoint and stores tokens in settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      gmail_client_id: 'client-id',
      gmail_client_secret: 'client-secret',
      gmail_redirect_uri: 'http://localhost:3000/api/auth/gmail/callback',
    });

    vi.mocked(setSetting).mockResolvedValue(undefined);

    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-tok',
        refresh_token: 'refresh-tok',
        expires_in: 3600,
      }),
    });

    await handleCallback('auth-code-123');

    expect(fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(setSetting).toHaveBeenCalledWith('gmail_access_token', 'access-tok');
    expect(setSetting).toHaveBeenCalledWith('gmail_refresh_token', 'refresh-tok');
    expect(setSetting).toHaveBeenCalledWith('gmail_token_expiry', expect.any(String));
  });
});

// ─── sync ─────────────────────────────────────────────────────────────────────

describe('sync', () => {
  it('logs error and returns when no valid token', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      gmail_access_token: null,
      gmail_refresh_token: null,
      gmail_token_expiry: null,
    });
    vi.mocked(logSync).mockResolvedValue(undefined);

    await sync();

    expect(logSync).toHaveBeenCalledWith('gmail', 'error', 'No valid Gmail token');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('syncs mail and logs success', async () => {
    const futureExpiry = String(Date.now() + 10 * 60 * 1000);
    vi.mocked(getSettings).mockResolvedValue({
      gmail_access_token: 'valid-token',
      gmail_refresh_token: 'refresh-token',
      gmail_token_expiry: futureExpiry,
    });

    vi.mocked(logSync).mockResolvedValue(undefined);
    vi.mocked(upsertEmail).mockResolvedValue({} as any);

    vi.mocked(fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        // message list
        ok: true,
        json: async () => ({
          messages: [{ id: 'msg-1' }],
        }),
      })
      .mockResolvedValueOnce({
        // full message fetch
        ok: true,
        json: async () => ({
          id: 'msg-1',
          labelIds: ['INBOX'],
          snippet: 'Hello world',
          internalDate: '1744700000000',
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject' },
              { name: 'From', value: 'Alice <alice@example.com>' },
            ],
          },
        }),
      });

    await sync();

    expect(upsertEmail).toHaveBeenCalledTimes(1);
    expect(upsertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'gmail',
        sourceId: 'msg-1',
        subject: 'Test Subject',
        senderName: 'Alice',
        senderEmail: 'alice@example.com',
        isRead: true,
      }),
    );
    expect(logSync).toHaveBeenCalledWith('gmail', 'success');
  });
});
