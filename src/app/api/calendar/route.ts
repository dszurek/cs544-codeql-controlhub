import { NextRequest, NextResponse } from 'next/server';
import { getEvents } from '@/lib/calendar';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const options: Parameters<typeof getEvents>[0] = {};

  const source = sp.get('source');
  if (source) options.source = source;

  const startDateStr = sp.get('startDate');
  if (startDateStr) {
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }
    options.startDate = startDate;
  }

  const endDateStr = sp.get('endDate');
  if (endDateStr) {
    const endDate = new Date(endDateStr);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }
    options.endDate = endDate;
  }

  const events = await getEvents(options);
  return NextResponse.json({ events });
}
