import type { CalendarEventData } from './EventDetail';

/** Per-source fallback colors for calendar events without an explicit color. */
const SOURCE_COLORS: Record<string, string> = {
  outlook: '#0078d4',
  icloud: '#555555',
};

/** An event's display color: its own color, else its source default, else leather. */
export function getEventColor(event: CalendarEventData): string {
  return event.color ?? SOURCE_COLORS[event.source] ?? '#b07a4f';
}
