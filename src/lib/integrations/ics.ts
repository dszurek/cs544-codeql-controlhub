import { prisma } from '@/lib/db';
import { upsertEvent } from '@/lib/calendar';
import { logSync } from '@/lib/syncLog';
import { parseVEvents, parseICalDate, isAllDay } from '@/lib/integrations/icloud';
import { sourceTag } from '@/lib/calendarSources';

export interface IcsSyncResult {
  sourceId: string;
  url: string;
  imported: number;
  error?: string;
}

export async function syncIcsSource(sourceId: string): Promise<IcsSyncResult> {
  const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } });
  if (!source) return { sourceId, url: '', imported: 0, error: 'Not found' };
  if (!source.enabled) return { sourceId, url: source.url, imported: 0, error: 'Disabled' };

  try {
    const response = await fetch(source.url, {
      headers: { Accept: 'text/calendar' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    const events = parseVEvents(text);
    const tag = sourceTag(sourceId);
    const calendarName = source.label ?? source.url;

    let imported = 0;
    for (const event of events) {
      if (!event.dtstart) continue;
      const startAt = parseICalDate(event.dtstart);
      const endAt = event.dtend
        ? parseICalDate(event.dtend)
        : new Date(startAt.getTime() + 60 * 60 * 1000);
      await upsertEvent({
        source: tag,
        sourceId: event.uid,
        title: event.summary,
        startAt,
        endAt,
        allDay: isAllDay(event.dtstart),
        location: event.location ?? undefined,
        calendarName,
        color: source.color ?? undefined,
        rawData: event.raw,
      });
      imported++;
    }

    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: { lastSyncedAt: new Date(), lastError: null },
    });
    return { sourceId, url: source.url, imported };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: { lastError: message },
    });
    return { sourceId, url: source.url, imported: 0, error: message };
  }
}

export async function sync(): Promise<void> {
  const sources = await prisma.calendarSource.findMany({ where: { enabled: true } });
  const results: IcsSyncResult[] = [];
  let errors = 0;

  for (const source of sources) {
    const result = await syncIcsSource(source.id);
    results.push(result);
    if (result.error) errors++;
  }

  if (errors > 0) {
    const msg = results
      .filter((r) => r.error)
      .map((r) => `${r.url}: ${r.error}`)
      .join('; ');
    await logSync('ics', 'error', msg);
  } else {
    await logSync('ics', 'success');
  }
}
