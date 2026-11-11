import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSetting, setSetting } from '@/lib/settings';
import { getEvents } from '@/lib/calendar';
import { generateIcsFeed, type IcsEventLike } from '@/lib/icsGenerator';
import { prisma } from '@/lib/db';

const TOKEN_KEY = 'calendar_feed_token';

async function getOrCreateToken(): Promise<string> {
  const existing = await getSetting(TOKEN_KEY);
  if (existing) return existing;
  const token = randomBytes(24).toString('hex');
  await setSetting(TOKEN_KEY, token);
  return token;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const stored = await getOrCreateToken();
  if (token !== stored) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const events = await getEvents({ startDate: start, endDate: end });

  // Flow plan blocks join the feed — phone calendars show the planned
  // day with zero write-OAuth involved. Degrades to events-only on error
  // so a subscribed calendar never sees a broken feed.
  let planEvents: IcsEventLike[] = [];
  try {
    const planned = await prisma.task.findMany({
      where: { status: 'pending', blockStart: { gte: start }, blockEnd: { not: null } },
    });
    planEvents = planned.map((t) => ({
      id: `flow-${t.id}`,
      title: `▸ ${t.title}`,
      startAt: t.blockStart as Date,
      endAt: t.blockEnd as Date,
      allDay: false,
      calendarName: 'ControlHub Plan',
    }));
  } catch (e) {
    console.error('[calendar/feed] plan blocks unavailable:', e);
  }

  const ics = generateIcsFeed([...events, ...planEvents]);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="controlhub.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
