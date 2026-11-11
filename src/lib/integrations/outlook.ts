import { getSettings, setSetting } from '@/lib/settings';
import { upsertEvent } from '@/lib/calendar';
import { upsertEmail } from '@/lib/mail';
import { logSync } from '@/lib/syncLog';

// ---- Token management ----

export async function getValidAccessToken(): Promise<string | null> {
  const settings = await getSettings([
    'outlook_access_token',
    'outlook_refresh_token',
    'outlook_token_expiry',
  ]);

  const accessToken = settings['outlook_access_token'];
  if (!accessToken) return null;

  const expiry = settings['outlook_token_expiry'];
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
    'outlook_refresh_token',
    'outlook_client_id',
    'outlook_client_secret',
  ]);

  const refreshToken = settings['outlook_refresh_token'];
  const clientId = settings['outlook_client_id'];
  const clientSecret = settings['outlook_client_secret'];

  if (!refreshToken || !clientId || !clientSecret) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const newAccessToken: string = data.access_token;
    const expiresIn: number = data.expires_in;

    await setSetting('outlook_access_token', newAccessToken);
    await setSetting('outlook_token_expiry', String(Date.now() + expiresIn * 1000));
    if (data.refresh_token) {
      await setSetting('outlook_refresh_token', data.refresh_token);
    }

    return newAccessToken;
  } catch {
    return null;
  }
}

export async function buildAuthUrl(): Promise<string> {
  const settings = await getSettings(['outlook_client_id', 'outlook_redirect_uri']);
  const clientId = settings['outlook_client_id'] ?? '';
  const redirectUri = settings['outlook_redirect_uri'] ?? '';

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'offline_access Mail.Read Calendars.Read',
    response_mode: 'query',
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function handleCallback(code: string): Promise<void> {
  const settings = await getSettings([
    'outlook_client_id',
    'outlook_client_secret',
    'outlook_redirect_uri',
  ]);

  const clientId = settings['outlook_client_id'] ?? '';
  const clientSecret = settings['outlook_client_secret'] ?? '';
  const redirectUri = settings['outlook_redirect_uri'] ?? '';

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
  );

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  await setSetting('outlook_access_token', data.access_token);
  await setSetting('outlook_refresh_token', data.refresh_token);
  await setSetting('outlook_token_expiry', String(Date.now() + data.expires_in * 1000));
}

// ---- Sync ----

export async function sync(): Promise<void> {
  try {
    const token = await getValidAccessToken();
    if (!token) {
      await logSync('outlook', 'error', 'No valid Outlook token');
      return;
    }

    await syncCalendar(token);
    await syncMail(token);
    await logSync('outlook', 'success');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync('outlook', 'error', message);
    throw err;
  }
}

interface GraphCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  location?: { displayName?: string };
  calendar?: { name?: string };
}

function parseGraphDateTime(dateTime: string): Date {
  // If the string doesn't include Z or +, append Z to treat as UTC
  if (!dateTime.includes('Z') && !dateTime.includes('+')) {
    return new Date(dateTime + 'Z');
  }
  return new Date(dateTime);
}

async function syncCalendar(token: string): Promise<void> {
  const startDateTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDateTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({ startDateTime, endDateTime });
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Calendar fetch failed: ${response.status}`);
  }

  const data: { value: GraphCalendarEvent[] } = await response.json();

  for (const event of data.value) {
    await upsertEvent({
      source: 'outlook',
      sourceId: event.id,
      title: event.subject,
      startAt: parseGraphDateTime(event.start.dateTime),
      endAt: parseGraphDateTime(event.end.dateTime),
      allDay: event.isAllDay,
      location: event.location?.displayName ?? undefined,
      calendarName: event.calendar?.name ?? 'Outlook Calendar',
      rawData: JSON.stringify(event),
    });
  }
}

interface GraphMessage {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  bodyPreview: string;
  isRead: boolean;
  receivedDateTime: string;
}

async function syncMail(token: string): Promise<void> {
  const params = new URLSearchParams({
    $top: '50',
    $select: 'id,subject,from,bodyPreview,isRead,receivedDateTime',
    $orderby: 'receivedDateTime desc',
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Mail fetch failed: ${response.status}`);
  }

  const data: { value: GraphMessage[] } = await response.json();

  for (const message of data.value) {
    await upsertEmail({
      source: 'outlook',
      sourceId: message.id,
      subject: message.subject,
      senderName: message.from.emailAddress.name,
      senderEmail: message.from.emailAddress.address,
      preview: message.bodyPreview?.slice(0, 500),
      isRead: message.isRead,
      receivedAt: new Date(message.receivedDateTime),
    });
  }
}
