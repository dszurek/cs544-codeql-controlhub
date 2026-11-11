import { NextRequest, NextResponse } from 'next/server';
import {
  createEventFromEmail,
  getEventsForEmail,
  linkEmailToEvent,
  unlinkEmailFromEvent,
} from '@/lib/emailEventLinks';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const events = await getEventsForEmail(id);
  return NextResponse.json({ events });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: emailId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Mode 1: link to an existing event by id
  if (typeof body.eventId === 'string') {
    const link = await linkEmailToEvent(emailId, body.eventId);
    return NextResponse.json({ link }, { status: 201 });
  }

  // Mode 2: create a new event from this email and link them
  if (typeof body.title === 'string' && typeof body.startAt === 'string') {
    const startAt = new Date(body.startAt);
    if (isNaN(startAt.getTime())) {
      return NextResponse.json({ error: 'Invalid startAt' }, { status: 400 });
    }
    let endAt: Date;
    if (typeof body.endAt === 'string') {
      endAt = new Date(body.endAt);
      if (isNaN(endAt.getTime())) {
        return NextResponse.json({ error: 'Invalid endAt' }, { status: 400 });
      }
    } else {
      endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    }
    const event = await createEventFromEmail(emailId, {
      title: body.title,
      startAt,
      endAt,
      allDay: typeof body.allDay === 'boolean' ? body.allDay : undefined,
      location: typeof body.location === 'string' ? body.location : undefined,
    });
    return NextResponse.json({ event }, { status: 201 });
  }

  return NextResponse.json(
    { error: 'Provide either eventId, or {title, startAt, endAt?}' },
    { status: 400 },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: emailId } = await params;
  const eventId = request.nextUrl.searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ error: 'eventId query param required' }, { status: 400 });
  }
  await unlinkEmailFromEvent(emailId, eventId);
  return NextResponse.json({ ok: true });
}
