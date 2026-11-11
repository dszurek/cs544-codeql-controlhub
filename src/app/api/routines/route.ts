import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateTrigger, validateCondition, validateAction } from '@/lib/routines/types';

export async function GET() {
  try {
    const routines = await prisma.routine.findMany({
      orderBy: { createdAt: 'desc' },
      include: { runs: { orderBy: { firedAt: 'desc' }, take: 1 } },
    });
    return NextResponse.json({ routines });
  } catch (e) {
    console.error('[routines]', e);
    return NextResponse.json({ error: 'Failed to load routines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
    const trigger = validateTrigger(body.trigger);

    // Validate strictly: an invalid condition that got silently dropped would
    // turn a gated automation ("only at night") into an ungated one.
    const rawConditions: unknown[] = Array.isArray(body.conditions) ? body.conditions : [];
    const conditions = rawConditions.map(validateCondition);
    const rawActions: unknown[] = Array.isArray(body.actions) ? body.actions : [];
    const actions = rawActions.map(validateAction);

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!trigger) return NextResponse.json({ error: 'Invalid trigger' }, { status: 400 });
    if (conditions.some((c) => c === null))
      return NextResponse.json({ error: 'One or more conditions are invalid' }, { status: 400 });
    if (actions.some((a) => a === null))
      return NextResponse.json({ error: 'One or more actions are invalid' }, { status: 400 });
    if (actions.length === 0) return NextResponse.json({ error: 'At least one valid action is required' }, { status: 400 });

    const routine = await prisma.routine.create({
      data: {
        name,
        trigger: JSON.stringify(trigger),
        conditions: JSON.stringify(conditions),
        actions: JSON.stringify(actions),
        cooldownMinutes: Number.isInteger(body.cooldownMinutes) ? body.cooldownMinutes : 0,
      },
    });
    return NextResponse.json({ routine });
  } catch (e) {
    console.error('[routines]', e);
    return NextResponse.json({ error: 'Failed to create routine' }, { status: 500 });
  }
}
