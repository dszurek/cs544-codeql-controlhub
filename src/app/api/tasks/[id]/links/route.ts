import { NextRequest, NextResponse } from 'next/server';
import {
  linkTaskToEmail,
  linkTaskToEvent,
  unlinkTaskFromEmail,
  unlinkTaskFromEvent,
} from '@/lib/taskRelations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.emailId === 'string') {
    const link = await linkTaskToEmail(id, body.emailId);
    return NextResponse.json({ link }, { status: 201 });
  }
  if (typeof body.eventId === 'string') {
    const link = await linkTaskToEvent(id, body.eventId);
    return NextResponse.json({ link }, { status: 201 });
  }
  return NextResponse.json({ error: 'Provide emailId or eventId' }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const emailId = request.nextUrl.searchParams.get('emailId');
  const eventId = request.nextUrl.searchParams.get('eventId');
  if (emailId) {
    await unlinkTaskFromEmail(id, emailId);
    return NextResponse.json({ ok: true });
  }
  if (eventId) {
    await unlinkTaskFromEvent(id, eventId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Provide emailId or eventId query param' }, { status: 400 });
}
