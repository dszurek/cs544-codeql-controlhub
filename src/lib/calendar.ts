import type { CalendarEvent } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from './db';

export interface GetEventsOptions {
  source?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function getEvents(options: GetEventsOptions = {}): Promise<CalendarEvent[]> {
  const { source, startDate, endDate } = options;

  const where: Prisma.CalendarEventWhereInput = {};

  if (source !== undefined) where.source = source;
  if (startDate !== undefined) where.startAt = { ...((where.startAt as object) ?? {}), gte: startDate };
  if (endDate !== undefined) where.startAt = { ...((where.startAt as object) ?? {}), lte: endDate };

  return prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: 'asc' },
  });
}

export async function upsertEvent(data: {
  title: string;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  location?: string;
  source: string;
  sourceId: string;
  calendarName: string;
  color?: string;
  rawData?: string;
}): Promise<CalendarEvent> {
  const { source, sourceId, ...rest } = data;

  return prisma.calendarEvent.upsert({
    where: { source_sourceId: { source, sourceId } },
    create: { source, sourceId, ...rest },
    update: rest,
  });
}

export async function deleteEventsBySource(source: string): Promise<void> {
  await prisma.calendarEvent.deleteMany({ where: { source } });
}
