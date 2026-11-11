import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { runRoutineNow } from '@/lib/routines/engine';

/** Manually fire a routine's actions, bypassing trigger/cooldown/dedupe. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const routine = await prisma.routine.findUnique({ where: { id } });
    if (!routine) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const detail = await runRoutineNow(routine.id);
    return NextResponse.json(detail);
  } catch (e) {
    console.error('[routines/run]', e);
    return NextResponse.json({ error: 'Failed to run routine' }, { status: 500 });
  }
}
