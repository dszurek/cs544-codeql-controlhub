import { getSettings, setSetting } from '@/lib/settings';
import { upsertEmail } from '@/lib/mail';
import { logSync } from '@/lib/syncLog';

// ---- Token management ----

export async function getValidAccessToken(): Promise<string | null> {
  const settings = await getSettings([
    'gmail_access_token',
    'gmail_refresh_token',
    'gmail_token_expiry',
  ]);

  const accessToken = settings['gmail_access_token'];
  if (!accessToken) return null;

  const expiry = settings['gmail_token_expiry'];
  const expiryMs = expiry ? parseInt(expiry, 10) : 0;
  const nowMs = Date.now();

  // If token expires more than 60 seconds in the future, return it as-is
  if (expiryMs - nowMs > 60 * 1000) {
    return accessToken;
  }

  // Otherwise refresh
  return refreshAccessToken();
}

async function refreshAccessToken(): Promise<string | null> {
  const settings = await getSettings([
    'gmail_refresh_token',
    'gmail_client_id',
    'gmail_client_secret',
  ]);

  const refreshToken = settings['gmail_refresh_token'];
  const clientId = settings['gmail_client_id'];
  const clientSecret = settings['gmail_client_secret'];

  if (!refreshToken || !clientId || !clientSecret) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const newAccessToken: string = data.access_token;
    const expiresIn: number = data.expires_in;

    await setSetting('gmail_access_token', newAccessToken);
    await setSetting('gmail_token_expiry', String(Date.now() + expiresIn * 1000));
    // Google refresh token does not rotate — only update if a new one is returned
    if (data.refresh_token) {
      await setSetting('gmail_refresh_token', data.refresh_token);
    }

    return newAccessToken;
  } catch {
    return null;
  }
}

export async function buildAuthUrl(): Promise<string> {
  const settings = await getSettings(['gmail_client_id', 'gmail_redirect_uri']);
  const clientId = settings['gmail_client_id'] ?? '';
  const redirectUri = settings['gmail_redirect_uri'] ?? '';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleCallback(code: string): Promise<void> {
  const settings = await getSettings([
    'gmail_client_id',
    'gmail_client_secret',
    'gmail_redirect_uri',
  ]);

  const clientId = settings['gmail_client_id'] ?? '';
  const clientSecret = settings['gmail_client_secret'] ?? '';
  const redirectUri = settings['gmail_redirect_uri'] ?? '';

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  await setSetting('gmail_access_token', data.access_token);
  await setSetting('gmail_refresh_token', data.refresh_token);
  await setSetting('gmail_token_expiry', String(Date.now() + data.expires_in * 1000));
}

// ---- Sync ----

export async function sync(): Promise<void> {
  try {
    const token = await getValidAccessToken();
    if (!token) {
      await logSync('gmail', 'error', 'No valid Gmail token');
      return;
    }

    await syncMail(token);
    await logSync('gmail', 'success');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync('gmail', 'error', message);
    throw err;
  }
}

// ---- Gmail API types ----

interface GmailMessage {
  id: string;
  labelIds: string[];
  snippet: string;
  internalDate: string; // epoch ms as string
  payload: {
    headers: Array<{ name: string; value: string }>;
  };
}

function getHeader(msg: GmailMessage, name: string): string | undefined {
  return msg.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  )?.value;
}

function parseSender(from: string): { name: string; email: string } {
  // "Display Name <addr@example.com>" or just "addr@example.com"
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim() || match[2], email: match[2] };
  return { name: from, email: from };
}

async function syncMail(token: string): Promise<void> {
  // Step 1: fetch message list
  const listResponse = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX',
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!listResponse.ok) {
    throw new Error(`Gmail message list fetch failed: ${listResponse.status}`);
  }

  const listData: { messages?: Array<{ id: string }> } = await listResponse.json();
  const messages = listData.messages ?? [];

  // Step 2: fetch each message concurrently
  const fullMessages = await Promise.all(
    messages.map(async ({ id }) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        throw new Error(`Gmail message fetch failed for ${id}: ${res.status}`);
      }
      return res.json() as Promise<GmailMessage>;
    }),
  );

  // Step 3: upsert each message
  await Promise.all(
    fullMessages.map((message) => {
      const from = getHeader(message, 'From') ?? '';
      const { name: senderName, email: senderEmail } = parseSender(from);

      return upsertEmail({
        source: 'gmail',
        sourceId: message.id,
        subject: getHeader(message, 'Subject') ?? '(no subject)',
        senderName,
        senderEmail,
        preview: message.snippet?.slice(0, 500),
        isRead: !message.labelIds.includes('UNREAD'),
        receivedAt: new Date(Number(message.internalDate)),
      });
    }),
  );
}
