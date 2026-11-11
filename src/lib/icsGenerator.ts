/** Structural event shape — Prisma CalendarEvents satisfy it, and so do
 * synthesized entries like Flow plan blocks. */
export interface IcsEventLike {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  location?: string | null;
  calendarName?: string | null;
}

function formatIcsDate(d: Date, allDay: boolean): string {
  if (allDay) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return parts.join('\r\n');
}

export function generateIcsFeed(
  events: IcsEventLike[],
  calendarName = 'ControlHub Merged',
): string {
  const now = formatIcsDate(new Date(), false);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ControlHub//Merged Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    const dtstart = formatIcsDate(event.startAt, event.allDay);
    const dtend = formatIcsDate(event.endAt, event.allDay);
    const startProp = event.allDay ? 'DTSTART;VALUE=DATE' : 'DTSTART';
    const endProp = event.allDay ? 'DTEND;VALUE=DATE' : 'DTEND';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@controlhub.local`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`${startProp}:${dtstart}`);
    lines.push(`${endProp}:${dtend}`);
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.calendarName) lines.push(`X-CALENDAR:${escapeText(event.calendarName)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
}
