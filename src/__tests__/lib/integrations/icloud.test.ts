import { sync, parseICalDate } from '@/lib/integrations/icloud';

vi.mock('@/lib/settings', () => ({
  getSetting: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock('@/lib/calendar', () => ({
  upsertEvent: vi.fn(),
}));

vi.mock('@/lib/syncLog', () => ({
  logSync: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    task: { upsert: vi.fn() },
  },
}));

import { getSettings, getSetting } from '@/lib/settings';
import { upsertEvent } from '@/lib/calendar';
import { logSync } from '@/lib/syncLog';
import { prisma } from '@/lib/db';

// ─── XML Fixtures ──────────────────────────────────────────────────────────────

const PRINCIPAL_XML = `<D:multistatus xmlns:D="DAV:">
  <D:response><D:propstat><D:prop>
    <D:current-user-principal><D:href>/principals/12345/</D:href></D:current-user-principal>
  </D:prop></D:propstat></D:response>
</D:multistatus>`;

const CALENDAR_HOME_XML = `<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response><D:propstat><D:prop>
    <C:calendar-home-set><D:href>/12345/calendars/</D:href></C:calendar-home-set>
  </D:prop></D:propstat></D:response>
</D:multistatus>`;

const CALENDARS_XML = `<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/12345/calendars/personal/</D:href>
    <D:propstat><D:prop>
      <D:displayname>Blackboard</D:displayname>
      <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
    </D:prop></D:propstat>
  </D:response>
</D:multistatus>`;

const EVENTS_XML = `<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response><D:propstat><D:prop>
    <C:calendar-data>BEGIN:VCALENDAR
BEGIN:VEVENT
UID:abc-123
SUMMARY:HW1 Due
DTSTART:20260415T120000Z
DTEND:20260415T130000Z
END:VEVENT
END:VCALENDAR</C:calendar-data>
  </D:prop></D:propstat></D:response>
</D:multistatus>`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mockFetchWithFixtures() {
  vi.mocked(fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ ok: true, text: async () => PRINCIPAL_XML })
    .mockResolvedValueOnce({ ok: true, text: async () => CALENDAR_HOME_XML })
    .mockResolvedValueOnce({ ok: true, text: async () => CALENDARS_XML })
    .mockResolvedValueOnce({ ok: true, text: async () => EVENTS_XML });
}

function mockCredentials() {
  vi.mocked(getSettings).mockResolvedValue({
    icloud_apple_id: 'test@icloud.com',
    icloud_app_password: 'xxxx-xxxx',
    icloud_blackboard_calendar: null,
  });
  vi.mocked(getSetting).mockResolvedValue('Blackboard');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  vi.mocked(logSync).mockResolvedValue(undefined);
  vi.mocked(upsertEvent).mockResolvedValue({} as any);
  vi.mocked(prisma.task.upsert).mockResolvedValue({} as any);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── sync tests ────────────────────────────────────────────────────────────────

describe('sync', () => {
  it('returns early with error log when credentials missing', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      icloud_apple_id: null,
      icloud_app_password: null,
      icloud_blackboard_calendar: null,
    });

    await sync();

    expect(logSync).toHaveBeenCalledWith('icloud', 'error', 'iCloud credentials not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('makes 3 PROPFIND requests + 1 REPORT request (fetch called 4 times)', async () => {
    mockCredentials();
    mockFetchWithFixtures();

    await sync();

    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('calls upsertEvent with correct data', async () => {
    mockCredentials();
    mockFetchWithFixtures();

    await sync();

    expect(upsertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'icloud',
        sourceId: 'abc-123',
        title: 'HW1 Due',
        allDay: false,
        calendarName: 'Blackboard',
      }),
    );
  });

  it('calls prisma.task.upsert when calendar name matches Blackboard', async () => {
    mockCredentials();
    mockFetchWithFixtures();

    await sync();

    expect(prisma.task.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalId: 'icloud:abc-123' },
        create: expect.objectContaining({
          title: 'HW1 Due',
          source: 'blackboard_sync',
          externalId: 'icloud:abc-123',
        }),
      }),
    );
  });

  it('logs success after completing', async () => {
    mockCredentials();
    mockFetchWithFixtures();

    await sync();

    expect(logSync).toHaveBeenCalledWith('icloud', 'success');
  });
});

// ─── parseICalDate tests ───────────────────────────────────────────────────────

describe('parseICalDate', () => {
  it('parses 20260415 as a Date with date 2026-04-15', () => {
    const date = parseICalDate('20260415');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3); // 0-indexed: April = 3
    expect(date.getDate()).toBe(15);
  });

  it('parses 20260415T100000Z as UTC 10:00', () => {
    const date = parseICalDate('20260415T100000Z');
    expect(date.toISOString()).toBe('2026-04-15T10:00:00.000Z');
  });
});
