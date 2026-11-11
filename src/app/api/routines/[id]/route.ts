import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateTrigger, validateCondition, validateAction } from '@/lib/routines/types';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (Number.isInteger(body.cooldownMinutes)) data.cooldownMinutes = body.cooldownMinutes;
    if (body.trigger !== undefined) {
      const t = validateTrigger(body.trigger);
      if (!t) return NextResponse.json({ error: 'Invalid trigger' }, { status: 400 });
      data.trigger = JSON.stringify(t);
    }
    if (body.conditions !== undefined) {
      const raw: unknown[] = Array.isArray(body.conditions) ? body.conditions : [];
      const c = raw.map(validateCondition);
      if (c.some((x) => x === null))
        return NextResponse.json({ error: 'One or more conditions are invalid' }, { status: 400 });
      data.conditions = JSON.stringify(c);
    }
    if (body.actions !== undefined) {
      const raw: unknown[] = Array.isArray(body.actions) ? body.actions : [];
      const a = raw.map(validateAction);
      if (a.some((x) => x === null))
        return NextResponse.json({ error: 'One or more actions are invalid' }, { status: 400 });
      if (a.length === 0) return NextResponse.json({ error: 'At least one valid action is required' }, { status: 400 });
      data.actions = JSON.stringify(a);
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const routine = await prisma.routine.update({ where: { id }, data });
    return NextResponse.json({ routine });
  } catch (e) {
    console.error('[routines/patch]', e);
    return NextResponse.json({ error: 'Failed to update routine' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.routine.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[routines/delete]', e);
    return NextResponse.json({ error: 'Failed to delete routine' }, { status: 500 });
  }
}
