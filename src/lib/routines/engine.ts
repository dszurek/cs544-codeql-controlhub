import { prisma } from '@/lib/db';
import { parseRoutine, type Action, type Trigger, type Condition } from './types';
import {
  evaluateTrigger,
  evaluateConditions,
  neededContext,
  type RoutineContext,
} from './matcher';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Build only the context slices the active routines actually reference. */
async function buildContext(triggers: Trigger[], conditions: Condition[][]): Promise<RoutineContext> {
  const now = new Date();
  const need = neededContext(triggers, conditions);

  const ctx: RoutineContext = { now, events: [], overdueTasks: [], health: null, haStates: new Map() };

  if (need.events) {
    const { getEvents } = await import('@/lib/calendar');
    const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const events = await getEvents({ startDate: now, endDate: new Date(day0.getTime() + DAY_MS) });
    ctx.events = events
      .filter((e) => !e.allDay)
      .map((e) => ({ id: e.id, startAt: e.startAt, title: e.title }));
  }

  if (need.overdueTasks) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tasks = await prisma.task.findMany({
      where: { status: 'pending', dueDate: { lt: startOfToday } },
      select: { id: true, title: true },
      take: 20,
    });
    ctx.overdueTasks = tasks;
  }

  if (need.health) {
    const latest = await prisma.healthDaily.findFirst({ orderBy: { date: 'desc' } });
    if (latest) {
      ctx.health = {
        readiness: latest.readiness,
        sleepDebtMin: latest.sleepDebtMin,
        hrvMs: latest.hrvMs,
        restingHr: latest.restingHr,
      };
    }
  }

  if (need.haStates) {
    try {
      const { getStates } = await import('@/lib/integrations/homeassistant');
      const states = await getStates();
      ctx.haStates = new Map(states.map((s) => [s.entity_id, s.state]));
    } catch { /* HA offline → ha_state triggers simply don't match */ }
  }

  return ctx;
}

/**
 * Evaluate all enabled routines once. Called every minute by the
 * scheduler. Concurrency-safe enough for a single-process Pi.
 */
export async function runRoutinesTick(): Promise<{ evaluated: number; fired: number }> {
  const rows = await prisma.routine.findMany({ where: { enabled: true } });
  if (rows.length === 0) return { evaluated: 0, fired: 0 };

  const parsed = rows
    .map((r) => ({ row: r, def: parseRoutine(r.trigger, r.conditions, r.actions) }))
    .filter((x): x is { row: (typeof rows)[number]; def: NonNullable<ReturnType<typeof parseRoutine>> } => x.def !== null);

  const ctx = await buildContext(
    parsed.map((p) => p.def.trigger),
    parsed.map((p) => p.def.conditions),
  );

  let fired = 0;
  for (const { row, def } of parsed) {
    // Cooldown gate.
    if (row.cooldownMinutes > 0 && row.lastFiredAt) {
      if (ctx.now.getTime() - row.lastFiredAt.getTime() < row.cooldownMinutes * 60_000) continue;
    }

    const match = evaluateTrigger(def.trigger, ctx);
    if (!match.matched) continue;

    // Dedupe: same real-world cause shouldn't fire twice.
    if (match.dedupeKey) {
      const seen = await prisma.routineRun.findFirst({
        where: { routineId: row.id, dedupeKey: match.dedupeKey },
      });
      if (seen) continue;
    }

    if (!evaluateConditions(def.conditions, ctx)) continue;

    const detail = await executeActions(def.actions, row.name, ctx);
    await prisma.routineRun.create({
      data: { routineId: row.id, dedupeKey: match.dedupeKey ?? null, ok: detail.ok, detail: detail.message },
    });
    await prisma.routine.update({ where: { id: row.id }, data: { lastFiredAt: ctx.now } });
    fired++;
  }

  return { evaluated: parsed.length, fired };
}

/** Manual fire (test button): run a routine's actions, ignoring the
 *  trigger, cooldown, and dedupe. Conditions are also bypassed so the
 *  user sees the actions actually execute. */
export async function runRoutineNow(routineId: string): Promise<{ ok: boolean; message: string }> {
  const row = await prisma.routine.findUnique({ where: { id: routineId } });
  if (!row) return { ok: false, message: 'routine not found' };
  const def = parseRoutine(row.trigger, row.conditions, row.actions);
  if (!def) return { ok: false, message: 'routine is invalid' };

  const ctx = await buildContext([def.trigger], [def.conditions]);
  const detail = await executeActions(def.actions, row.name, ctx);
  await prisma.routineRun.create({
    data: { routineId: row.id, dedupeKey: null, ok: detail.ok, detail: `[manual] ${detail.message}` },
  });
  await prisma.routine.update({ where: { id: row.id }, data: { lastFiredAt: ctx.now } });
  return detail;
}

async function executeActions(
  actions: Action[],
  routineName: string,
  ctx: RoutineContext,
): Promise<{ ok: boolean; message: string }> {
  const results: string[] = [];
  let ok = true;

  for (const action of actions) {
    try {
      results.push(await executeAction(action, routineName, ctx));
    } catch (err) {
      ok = false;
      const msg = err instanceof Error ? err.message : String(err);
      results.push(`${action.kind} failed: ${msg}`);
      console.error(`[routines] ${routineName} action ${action.kind} failed:`, err);
    }
  }

  return { ok, message: results.join('; ') };
}

async function executeAction(action: Action, routineName: string, ctx: RoutineContext): Promise<string> {
  switch (action.kind) {
    case 'notify': {
      const { sendPush } = await import('@/lib/push');
      await prisma.signal.create({
        data: {
          kind: 'routine',
          title: action.title,
          body: action.body ?? '',
          glow: action.glow ?? 'attend',
        },
      });
      const res = await sendPush({ title: action.title, body: action.body, glow: action.glow });
      return `notified (push ×${res.sent})`;
    }
    case 'ha_scene': {
      const { callService } = await import('@/lib/integrations/homeassistant');
      await callService('scene', 'turn_on', { entity_id: action.entityId });
      return `scene ${action.entityId}`;
    }
    case 'ha_service': {
      const { callService } = await import('@/lib/integrations/homeassistant');
      await callService(action.domain, action.service, action.entityId ? { entity_id: action.entityId } : undefined);
      return `${action.domain}.${action.service}`;
    }
    case 'create_task': {
      const dueDate = action.dueInHours ? new Date(ctx.now.getTime() + action.dueInHours * 60 * 60 * 1000) : undefined;
      await prisma.task.create({
        data: {
          title: action.title,
          priority: action.priority ?? 3,
          source: 'routine',
          ...(dueDate ? { dueDate } : {}),
        },
      });
      return `task "${action.title}"`;
    }
    case 'replan_day': {
      const { replanToday } = await import('@/lib/flow');
      const blocks = await replanToday();
      return `replanned (${blocks.length} blocks)`;
    }
    case 'ai_job': {
      const { isJobType } = await import('@/lib/cortex/registry');
      if (!isJobType(action.jobType)) throw new Error(`unknown job type ${action.jobType}`);
      const { enqueueJob, processQueue } = await import('@/lib/cortex/runner');
      await enqueueJob(action.jobType);
      void processQueue();
      return `enqueued ${action.jobType}`;
    }
    case 'set_setting': {
      const { setSetting } = await import('@/lib/settings');
      await setSetting(action.key, action.value);
      return `set ${action.key}`;
    }
  }
}
