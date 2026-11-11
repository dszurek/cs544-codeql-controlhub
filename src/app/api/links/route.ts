import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const VALID_TYPES = new Set(['task', 'email', 'event', 'note', 'commit', 'repo']);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const entityType = sp.get('entityType');
  const entityId = sp.get('entityId');
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }
  const links = await prisma.taskLink.findMany({
    where: {
      OR: [
        { sourceType: entityType, sourceId: entityId },
        { targetType: entityType, targetId: entityId },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { sourceType, sourceId, targetType, targetId, label } = body;
  if (
    typeof sourceType !== 'string' || !VALID_TYPES.has(sourceType) ||
    typeof sourceId !== 'string' || !sourceId ||
    typeof targetType !== 'string' || !VALID_TYPES.has(targetType) ||
    typeof targetId !== 'string' || !targetId
  ) {
    return NextResponse.json({ error: 'invalid link payload' }, { status: 400 });
  }
  const link = await prisma.taskLink.upsert({
    where: {
      sourceType_sourceId_targetType_targetId: {
        sourceType, sourceId, targetType, targetId,
      },
    },
    update: { label: typeof label === 'string' ? label : null },
    create: {
      sourceType, sourceId, targetType, targetId,
      label: typeof label === 'string' ? label : null,
    },
  });
  return NextResponse.json({ link });
}

export async function DELETE(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const id = sp.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.taskLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
