import type { CalendarSource } from '@prisma/client';
import { prisma } from './db';

export const MAX_CALENDAR_SOURCES = 20;

export async function listCalendarSources(): Promise<CalendarSource[]> {
  return prisma.calendarSource.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function countCalendarSources(): Promise<number> {
  return prisma.calendarSource.count();
}

export async function createCalendarSource(input: {
  url: string;
  label?: string;
  color?: string;
}): Promise<CalendarSource> {
  return prisma.calendarSource.create({
    data: { url: input.url, label: input.label, color: input.color },
  });
}

export async function updateCalendarSource(
  id: string,
  data: Partial<{ label: string | null; color: string | null; enabled: boolean }>,
): Promise<CalendarSource> {
  return prisma.calendarSource.update({ where: { id }, data });
}

export async function deleteCalendarSource(id: string): Promise<void> {
  await prisma.calendarSource.delete({ where: { id } });
}

export function sourceTag(id: string): string {
  return `ics:${id}`;
}
