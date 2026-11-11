import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { entityType, entityId, until } = body;
  if (
    (entityType !== 'task' && entityType !== 'email') ||
    typeof entityId !== 'string' ||
    (typeof until !== 'string' && until !== null)
  ) {
    return NextResponse.json(
      { error: 'entityType (task|email), entityId, until required' },
      { status: 400 },
    );
  }
  const at = until === null || until === 'clear' ? null : new Date(until);
  if (at && Number.isNaN(at.getTime())) {
    return NextResponse.json({ error: 'until must be ISO date or null' }, { status: 400 });
  }
  if (entityType === 'task') {
    await prisma.task.update({ where: { id: entityId }, data: { snoozedUntil: at } });
  } else {
    await prisma.email.update({ where: { id: entityId }, data: { snoozedUntil: at } });
  }
  return NextResponse.json({ ok: true, until: at });
}
