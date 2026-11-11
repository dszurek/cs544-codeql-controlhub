import { NextRequest, NextResponse } from 'next/server';
import {
  listCalendarSources,
  createCalendarSource,
  countCalendarSources,
  MAX_CALENDAR_SOURCES,
} from '@/lib/calendarSources';

export async function GET() {
  const sources = await listCalendarSources();
  return NextResponse.json({ sources, max: MAX_CALENDAR_SOURCES });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : null;
  const label =
    typeof body.label === 'string' ? body.label.trim() || undefined : undefined;
  const color =
    typeof body.color === 'string' ? body.color.trim() || undefined : undefined;

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const existing = await countCalendarSources();
  if (existing >= MAX_CALENDAR_SOURCES) {
    return NextResponse.json(
      { error: `Cannot exceed ${MAX_CALENDAR_SOURCES} calendar sources` },
      { status: 400 },
    );
  }

  try {
    const source = await createCalendarSource({ url, label, color });
    return NextResponse.json({ source }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Calendar source with this URL already exists' },
      { status: 409 },
    );
  }
}
