import {
  getValidAccessToken,
  buildAuthUrl,
  handleCallback,
  sync,
} from '@/lib/integrations/outlook';

vi.mock('@/lib/settings', () => ({
  getSetting: vi.fn(),
  getSettings: vi.fn(),
  setSetting: vi.fn(),
}));

vi.mock('@/lib/calendar', () => ({
  upsertEvent: vi.fn(),
  deleteEventsBySource: vi.fn(),
}));

vi.mock('@/lib/mail', () => ({
  upsertEmail: vi.fn(),
}));

vi.mock('@/lib/syncLog', () => ({
  logSync: vi.fn(),
}));

import { getSettings, setSetting } from '@/lib/settings';
import { upsertEvent } from '@/lib/calendar';
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
      outlook_access_token: null,
      outlook_refresh_token: null,
      outlook_token_expiry: null,
    });

    const result = await getValidAccessToken();
    expect(result).toBeNull();
  });

  it('returns cached token when expiry is more than 60s away', async () => {
    const futureExpiry = String(Date.now() + 10 * 60 * 1000); // 10 minutes away
    vi.mocked(getSettings).mockResolvedValue({
      outlook_access_token: 'valid-token',
      outlook_refresh_token: 'refresh-token',
      outlook_token_expiry: futureExpiry,
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
        outlook_access_token: 'old-token',
        outlook_refresh_token: 'refresh-token',
        outlook_token_expiry: pastExpiry,
      })
      .mockResolvedValueOnce({
        // Second call: refreshAccessToken loads refresh creds
        outlook_refresh_token: 'refresh-token',
        outlook_client_id: 'client-id',
        outlook_client_secret: 'client-secret',
      });

    vi.mocked(setSetting).mockResolvedValue(undefined);

    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      }),
    });

    const result = await getValidAccessToken();
    expect(result).toBe('new-token');
    expect(fetch).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(setSetting).toHaveBeenCalledWith('outlook_access_token', 'new-token');
  });
});

// ─── buildAuthUrl ──────────────────────────────────────────────────────────────

describe('buildAuthUrl', () => {
  it('returns a URL string containing login.microsoftonline.com and the client_id', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      outlook_client_id: 'my-client-id',
      outlook_redirect_uri: 'http://localhost:3000/api/auth/outlook/callback',
    });

    const url = await buildAuthUrl();

    expect(url).toContain('login.microsoftonline.com');
    expect(url).toContain('my-client-id');
    expect(url).toContain('offline_access');
  });
});

// ─── handleCallback ────────────────────────────────────────────────────────────

describe('handleCallback', () => {
  it('calls fetch with the token endpoint and stores tokens in settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      outlook_client_id: 'client-id',
      outlook_client_secret: 'client-secret',
      outlook_redirect_uri: 'http://localhost:3000/api/auth/outlook/callback',
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
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(setSetting).toHaveBeenCalledWith('outlook_access_token', 'access-tok');
    expect(setSetting).toHaveBeenCalledWith('outlook_refresh_token', 'refresh-tok');
    expect(setSetting).toHaveBeenCalledWith('outlook_token_expiry', expect.any(String));
  });
});

// ─── sync ─────────────────────────────────────────────────────────────────────

describe('sync', () => {
  it('logs error and returns when no valid token', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      outlook_access_token: null,
      outlook_refresh_token: null,
      outlook_token_expiry: null,
    });
    vi.mocked(logSync).mockResolvedValue(undefined);

    await sync();

    expect(logSync).toHaveBeenCalledWith('outlook', 'error', 'No valid Outlook token');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls syncCalendar and syncMail then logs success', async () => {
    const futureExpiry = String(Date.now() + 10 * 60 * 1000);
    vi.mocked(getSettings).mockResolvedValue({
      outlook_access_token: 'valid-token',
      outlook_refresh_token: 'refresh-token',
      outlook_token_expiry: futureExpiry,
    });

    vi.mocked(logSync).mockResolvedValue(undefined);
    vi.mocked(upsertEvent).mockResolvedValue({} as any);
    vi.mocked(upsertEmail).mockResolvedValue({} as any);

    vi.mocked(fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        // syncCalendar
        ok: true,
        json: async () => ({
          value: [
            {
              id: 'evt-1',
              subject: 'Meeting',
              start: { dateTime: '2026-04-15T10:00:00.0000000', timeZone: 'UTC' },
              end: { dateTime: '2026-04-15T11:00:00.0000000', timeZone: 'UTC' },
              isAllDay: false,
              location: { displayName: 'Room A' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        // syncMail
        ok: true,
        json: async () => ({
          value: [
            {
              id: 'msg-1',
              subject: 'Hello',
              from: { emailAddress: { name: 'Alice', address: 'alice@example.com' } },
              bodyPreview: 'Hi there',
              isRead: false,
              receivedDateTime: '2026-04-15T09:00:00Z',
            },
          ],
        }),
      });

    await sync();

    expect(upsertEvent).toHaveBeenCalledTimes(1);
    expect(upsertEmail).toHaveBeenCalledTimes(1);
    expect(logSync).toHaveBeenCalledWith('outlook', 'success');
  });
});
