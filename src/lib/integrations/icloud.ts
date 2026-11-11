import { getSettings } from '@/lib/settings';
import { upsertEvent } from '@/lib/calendar';
import { logSync } from '@/lib/syncLog';
import { prisma } from '@/lib/db';

// ---- iCal data types ----

export interface VEvent {
  uid: string;
  summary: string;
  dtstart: string | null;
  dtend: string | null;
  location: string | null;
  raw: string;
}

// ---- iCal parsing helpers ----

export function parseVEvents(icalText: string): VEvent[] {
  const events: VEvent[] = [];
  const eventBlocks = icalText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  for (const block of eventBlocks) {
    const get = (prop: string) => {
      const match = block.match(new RegExp(`^${prop}[^:]*:(.*)$`, 'm'));
      return match?.[1]?.trim() ?? null;
    };
    const uid = get('UID');
    const summary = get('SUMMARY') ?? '(no title)';
    const dtstart = get('DTSTART');
    const dtend = get('DTEND') ?? get('DURATION');
    const location = get('LOCATION');
    if (!uid || !dtstart) continue;
    events.push({ uid, summary, dtstart, dtend, location, raw: block });
  }
  return events;
}

export function parseICalDate(val: string): Date {
  // Strip VALUE=DATE: prefix if present (e.g. "VALUE=DATE:20260415")
  const clean = val.replace(/^[^:]+:/, '');
  if (clean.length === 8) {
    // All-day date: YYYYMMDD — parse as local noon
    return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T12:00:00`);
  }
  // DATE-TIME: 20260415T100000Z or 20260415T100000
  const s = clean.replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/,
    '$1-$2-$3T$4:$5:$6$7',
  );
  return new Date(s);
}

export function isAllDay(dtstart: string): boolean {
  return !dtstart.includes('T');
}

// ---- XML helpers ----

function extractXmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]*)<`, 'i'));
  return match?.[1]?.trim() ?? null;
}

function propfindBody(props: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    ${props.join('\n    ')}
  </D:prop>
</D:propfind>`;
}

function calendarQueryBody(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${fmt(start)}" end="${fmt(end)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
}

// ---- CalDAV requests ----

async function caldavRequest(
  method: string,
  url: string,
  auth: string,
  body: string,
  depth: string,
): Promise<string> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/xml; charset=UTF-8',
      Depth: depth,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`CalDAV ${method} ${url} failed: ${response.status}`);
  }
  return response.text();
}

async function discoverCalendars(
  auth: string,
): Promise<Array<{ url: string; name: string }>> {
  // Step 1: Discover current-user-principal
  const principalXml = await caldavRequest(
    'PROPFIND',
    'https://caldav.icloud.com/',
    auth,
    propfindBody(['<D:current-user-principal/>']),
    '0',
  );

  const principalHref = extractXmlValue(principalXml, 'href');
  if (!principalHref) {
    throw new Error('Could not find current-user-principal href in CalDAV response');
  }

  const principalUrl = principalHref.startsWith('http')
    ? principalHref
    : `https://caldav.icloud.com${principalHref}`;

  // Step 2: Discover calendar-home-set
  const homeXml = await caldavRequest(
    'PROPFIND',
    principalUrl,
    auth,
    propfindBody(['<C:calendar-home-set/>']),
    '0',
  );

  const homeHref = extractXmlValue(homeXml, 'href');
  if (!homeHref) {
    throw new Error('Could not find calendar-home-set href in CalDAV response');
  }

  const homeUrl = homeHref.startsWith('http')
    ? homeHref
    : `https://caldav.icloud.com${homeHref}`;

  // Step 3: List calendars at depth 1
  const listXml = await caldavRequest(
    'PROPFIND',
    homeUrl,
    auth,
    propfindBody(['<D:displayname/>', '<D:resourcetype/>']),
    '1',
  );

  // Parse <D:response> blocks
  const responseBlocks = listXml.match(/<[^>]*response[^>]*>[\s\S]*?<\/[^>]*response>/gi) ?? [];
  const calendars: Array<{ url: string; name: string }> = [];

  for (const block of responseBlocks) {
    // Must have calendar resourcetype but not principal
    if (!/<[^>]*calendar[^>]*\/>/i.test(block)) continue;
    if (/<[^>]*principal[^>]*\/>/i.test(block)) continue;

    const href = extractXmlValue(block, 'href');
    const name = extractXmlValue(block, 'displayname');
    if (!href) continue;

    const url = href.startsWith('http') ? href : `https://caldav.icloud.com${href}`;
    calendars.push({ url, name: name ?? 'Unnamed Calendar' });
  }

  return calendars;
}

async function fetchEvents(
  auth: string,
  calendarUrl: string,
  start: Date,
  end: Date,
): Promise<VEvent[]> {
  const reportXml = await caldavRequest(
    'REPORT',
    calendarUrl,
    auth,
    calendarQueryBody(start, end),
    '1',
  );

  // Extract all <cal:calendar-data> or <C:calendar-data> elements
  const calDataBlocks =
    reportXml.match(/<[^>]*calendar-data[^>]*>([\s\S]*?)<\/[^>]*calendar-data>/gi) ?? [];

  const allEvents: VEvent[] = [];
  for (const block of calDataBlocks) {
    const icalText = block
      .replace(/^<[^>]*calendar-data[^>]*>/, '')
      .replace(/<\/[^>]*calendar-data>$/, '');
    const events = parseVEvents(icalText);
    allEvents.push(...events);
  }

  return allEvents;
}

// ---- Blackboard task upsert ----

async function upsertBlackboardTask(event: VEvent): Promise<void> {
  const externalId = 'icloud:' + event.uid;

  await prisma.task.upsert({
    where: { externalId },
    create: {
      title: event.summary,
      type: 'assignment',
      dueDate: event.dtstart ? parseICalDate(event.dtstart) : undefined,
      source: 'blackboard_sync',
      externalId,
      status: 'pending',
      priority: 3,
    },
    update: {
      title: event.summary,
      dueDate: parseICalDate(event.dtstart!),
    },
  });
}

// ---- Main sync ----

export async function sync(): Promise<void> {
  try {
    const settings = await getSettings([
      'icloud_apple_id',
      'icloud_app_password',
      'icloud_blackboard_calendar',
    ]);
    const appleId = settings['icloud_apple_id'];
    const appPassword = settings['icloud_app_password'];

    if (!appleId || !appPassword) {
      await logSync('icloud', 'error', 'iCloud credentials not configured');
      return;
    }

    const auth = 'Basic ' + Buffer.from(`${appleId}:${appPassword}`).toString('base64');
    const blackboardCalName = settings['icloud_blackboard_calendar'] ?? 'Blackboard';

    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const calendars = await discoverCalendars(auth);

    for (const calendar of calendars) {
      const events = await fetchEvents(auth, calendar.url, start, end);

      for (const event of events) {
        if (!event.dtstart) continue;

        const startAt = parseICalDate(event.dtstart);
        const endAt = event.dtend
          ? parseICalDate(event.dtend)
          : new Date(startAt.getTime() + 60 * 60 * 1000);
        const allDay = isAllDay(event.dtstart);

        await upsertEvent({
          source: 'icloud',
          sourceId: event.uid,
          title: event.summary,
          startAt,
          endAt,
          allDay,
          location: event.location ?? undefined,
          calendarName: calendar.name,
          rawData: event.raw,
        });

        if (calendar.name === blackboardCalName) {
          await upsertBlackboardTask(event);
        }
      }
    }

    await logSync('icloud', 'success');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync('icloud', 'error', message);
    throw err;
  }
}
