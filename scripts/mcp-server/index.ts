#!/usr/bin/env node
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
// Load .env.local then .env (same order Next.js uses)
loadDotenv({ path: path.resolve(process.cwd(), '.env.local') });
loadDotenv({ path: path.resolve(process.cwd(), '.env') });
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const server = new McpServer(
  { name: 'controlhub', version: '0.1.0' },
  { capabilities: { logging: {} } },
);

function text(obj: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(obj) }] };
}

server.registerTool(
  'list_tasks',
  {
    description:
      'List tasks. Filters: view (today|upcoming|all), status (pending|completed), priority (1-4), projectId.',
    inputSchema: {
      view: z.enum(['today', 'upcoming', 'all']).optional(),
      status: z.enum(['pending', 'completed']).optional(),
      priority: z.number().int().min(1).max(4).optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ view, status, priority, projectId }) => {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority !== undefined) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (view === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.dueDate = { gte: start, lt: end };
    } else if (view === 'upcoming') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.dueDate = { gte: start, lt: end };
    }
    const tasks = await prisma.task.findMany({ where, orderBy: { dueDate: 'asc' }, take: 50 });
    return text({ tasks });
  },
);

server.registerTool(
  'create_task',
  {
    description: 'Create a new task. Returns the created task.',
    inputSchema: {
      title: z.string().min(1),
      notes: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      priority: z.number().int().min(1).max(4).optional(),
      dueDate: z.string().optional(),
      dueTime: z.string().optional(),
      startDate: z.string().optional(),
      estimatedMinutes: z.number().int().positive().optional(),
      courseId: z.string().optional(),
      projectId: z.string().optional(),
      parentId: z.string().optional(),
    },
  },
  async (args) => {
    const task = await prisma.task.create({
      data: {
        title: args.title,
        notes: args.notes,
        description: args.description,
        type: args.type,
        priority: args.priority,
        dueDate: args.dueDate ? new Date(args.dueDate) : null,
        dueTime: args.dueTime,
        startDate: args.startDate ? new Date(args.startDate) : null,
        estimatedMinutes: args.estimatedMinutes,
        courseId: args.courseId,
        projectId: args.projectId,
        parentId: args.parentId,
      },
    });
    return text({ task });
  },
);

server.registerTool(
  'get_task',
  {
    description:
      'Get a task by id with its full graph: subtasks, blockers, linked emails/events, and comments.',
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return text({ error: 'Not found' });
    const [blockedByRows, blockRows, subtasks, comments, emailLinks, eventLinks] =
      await Promise.all([
        prisma.taskBlocker.findMany({ where: { taskId: id }, include: { blocker: true } }),
        prisma.taskBlocker.findMany({ where: { blockerId: id }, include: { task: true } }),
        prisma.task.findMany({ where: { parentId: id }, orderBy: { createdAt: 'asc' } }),
        prisma.taskComment.findMany({ where: { taskId: id }, orderBy: { createdAt: 'asc' } }),
        prisma.taskEmailLink.findMany({ where: { taskId: id } }),
        prisma.taskEventLink.findMany({ where: { taskId: id } }),
      ]);
    const emails =
      emailLinks.length === 0
        ? []
        : await prisma.email.findMany({ where: { id: { in: emailLinks.map((l) => l.emailId) } } });
    const events =
      eventLinks.length === 0
        ? []
        : await prisma.calendarEvent.findMany({
            where: { id: { in: eventLinks.map((l) => l.eventId) } },
          });
    return text({
      task,
      blockedBy: blockedByRows.map((r) => r.blocker),
      blocks: blockRows.map((r) => r.task),
      subtasks,
      comments,
      emails,
      events,
    });
  },
);

server.registerTool(
  'add_blocker',
  {
    description: 'Mark taskId as blocked by blockerId.',
    inputSchema: { taskId: z.string(), blockerId: z.string() },
  },
  async ({ taskId, blockerId }) => {
    if (taskId === blockerId) return text({ error: 'Cannot self-block' });
    const link = await prisma.taskBlocker.upsert({
      where: { taskId_blockerId: { taskId, blockerId } },
      create: { taskId, blockerId },
      update: {},
    });
    return text({ link });
  },
);

server.registerTool(
  'add_task_comment',
  {
    description: 'Add a comment to a task.',
    inputSchema: { taskId: z.string(), body: z.string().min(1) },
  },
  async ({ taskId, body }) => {
    const comment = await prisma.taskComment.create({ data: { taskId, body } });
    return text({ comment });
  },
);

server.registerTool(
  'update_task',
  {
    description: 'Update a task by id. Any fields can be updated.',
    inputSchema: {
      id: z.string(),
      title: z.string().optional(),
      notes: z.string().optional(),
      description: z.string().nullable().optional(),
      type: z.string().optional(),
      priority: z.number().int().min(1).max(4).optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
      dueDate: z.string().nullable().optional(),
      dueTime: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      estimatedMinutes: z.number().int().positive().nullable().optional(),
      courseId: z.string().nullable().optional(),
    },
  },
  async ({ id, ...rest }) => {
    const data: Record<string, unknown> = { ...rest };
    if ('dueDate' in data && data.dueDate) data.dueDate = new Date(data.dueDate as string);
    if ('startDate' in data && data.startDate) data.startDate = new Date(data.startDate as string);
    if (rest.status === 'completed') data.completedAt = new Date();
    if (rest.status && rest.status !== 'completed') data.completedAt = null;
    const task = await prisma.task.update({ where: { id }, data });
    return text({ task });
  },
);

server.registerTool(
  'complete_task',
  {
    description: 'Mark a task as completed by id.',
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const task = await prisma.task.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
    return text({ task });
  },
);

server.registerTool(
  'list_emails',
  {
    description:
      'List emails. Filters: source (outlook|gmail), isRead (bool), sender (substring match on senderEmail or senderName). Returns up to 50 most recent.',
    inputSchema: {
      source: z.string().optional(),
      isRead: z.boolean().optional(),
      sender: z.string().optional(),
    },
  },
  async ({ source, isRead, sender }) => {
    const where: Record<string, unknown> = {};
    if (source) where.source = source;
    if (isRead !== undefined) where.isRead = isRead;
    if (sender)
      where.OR = [
        { senderEmail: { contains: sender } },
        { senderName: { contains: sender } },
      ];
    const emails = await prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });
    return text({ emails });
  },
);

server.registerTool(
  'mark_email_read',
  {
    description: 'Mark an email as read or unread.',
    inputSchema: { id: z.string(), isRead: z.boolean() },
  },
  async ({ id, isRead }) => {
    const email = await prisma.email.update({ where: { id }, data: { isRead } });
    return text({ email });
  },
);

server.registerTool(
  'list_events',
  {
    description:
      'List calendar events within a date range (ISO strings). Source filter optional.',
    inputSchema: {
      startDate: z.string(),
      endDate: z.string(),
      source: z.string().optional(),
    },
  },
  async ({ startDate, endDate, source }) => {
    const where: Record<string, unknown> = {
      startAt: { gte: new Date(startDate), lte: new Date(endDate) },
    };
    if (source) where.source = source;
    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });
    return text({ events });
  },
);

server.registerTool(
  'link_email_to_event',
  {
    description: 'Create a link between an email and a calendar event.',
    inputSchema: { emailId: z.string(), eventId: z.string() },
  },
  async ({ emailId, eventId }) => {
    const link = await prisma.emailEventLink.upsert({
      where: { emailId_eventId: { emailId, eventId } },
      create: { emailId, eventId },
      update: {},
    });
    return text({ link });
  },
);

server.registerTool(
  'list_email_rules',
  { description: 'List configured email rules (alert/mute by sender).', inputSchema: {} },
  async () => {
    const rules = await prisma.emailRule.findMany({ orderBy: { createdAt: 'desc' } });
    return text({ rules });
  },
);

server.registerTool(
  'add_email_rule',
  {
    description:
      'Add an email rule. pattern matches against sender. matchType: contains|exact|regex. action: alert|mute.',
    inputSchema: {
      pattern: z.string(),
      matchType: z.enum(['contains', 'exact', 'regex']).optional(),
      action: z.enum(['alert', 'mute']),
      label: z.string().optional(),
    },
  },
  async (args) => {
    const rule = await prisma.emailRule.create({
      data: {
        pattern: args.pattern,
        matchType: args.matchType ?? 'contains',
        action: args.action,
        label: args.label,
      },
    });
    return text({ rule });
  },
);

server.registerTool(
  'remove_email_rule',
  { description: 'Remove an email rule by id.', inputSchema: { id: z.string() } },
  async ({ id }) => {
    await prisma.emailRule.delete({ where: { id } });
    return text({ ok: true });
  },
);

server.registerTool(
  'get_unread_summary',
  {
    description:
      'Summary counts and rule-triggered alerts: { outlook, gmail, alerts: [{rule, count, latest}] }',
    inputSchema: {},
  },
  async () => {
    const [outlook, gmail, rules] = await Promise.all([
      prisma.email.count({ where: { source: 'outlook', isRead: false } }),
      prisma.email.count({ where: { source: 'gmail', isRead: false } }),
      prisma.emailRule.findMany({ where: { action: 'alert' } }),
    ]);
    const alerts: Array<{ rule: unknown; count: number; latest: unknown }> = [];
    for (const rule of rules) {
      let where: Record<string, unknown> = { isRead: false };
      if (rule.matchType === 'exact') {
        where = { ...where, senderEmail: rule.pattern };
      } else {
        where = {
          ...where,
          OR: [
            { senderEmail: { contains: rule.pattern } },
            { senderName: { contains: rule.pattern } },
          ],
        };
      }
      const [count, latest] = await Promise.all([
        prisma.email.count({ where }),
        prisma.email.findFirst({ where, orderBy: { receivedAt: 'desc' } }),
      ]);
      if (count > 0) alerts.push({ rule, count, latest });
    }
    return text({ outlook, gmail, alerts });
  },
);

// ── Health (Apple Health via Health Auto Export) ──────────────────────

server.registerTool(
  'query_health_daily',
  {
    description:
      'Daily health rollups (sleep minutes + stages, HRV ms, resting HR, steps, active energy, readiness 0-100, sleepDebtMin). Dates are ISO YYYY-MM-DD; defaults to the last 14 days.',
    inputSchema: {
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    },
  },
  async ({ startDate, endDate }) => {
    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    const days = await prisma.healthDaily.findMany({
      where,
      orderBy: { date: 'desc' },
      take: startDate || endDate ? 90 : 14,
    });
    return text({ days });
  },
);

server.registerTool(
  'query_health_samples',
  {
    description:
      'Raw Apple Health samples for a metric type within a date range. Types include: heart_rate_variability, resting_heart_rate, heart_rate, step_count, active_energy, respiratory_rate, sleep_asleep, sleep_deep, sleep_rem, sleep_core, sleep_awake. Use for drill-downs the daily rollups cannot answer.',
    inputSchema: {
      type: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    },
  },
  async ({ type, startDate, endDate }) => {
    const samples = await prisma.healthSample.findMany({
      where: { type, startDate: { gte: new Date(startDate) }, endDate: { lte: new Date(endDate) } },
      orderBy: { startDate: 'asc' },
      take: 500,
    });
    return text({ count: samples.length, samples });
  },
);

server.registerTool(
  'get_health_baselines',
  {
    description:
      '30-day personal baselines (mean HRV, mean resting HR, sleep need minutes) plus the latest readiness and sleep debt. Compare daily values against these.',
    inputSchema: {},
  },
  async () => {
    const dailies = await prisma.healthDaily.findMany({ orderBy: { date: 'desc' }, take: 30 });
    const nums = (k: 'hrvMs' | 'restingHr' | 'sleepMinutes') =>
      dailies.map((d) => d[k]).filter((v): v is number => v != null);
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const sleepMean = mean(nums('sleepMinutes'));
    const latest = dailies[0] ?? null;
    return text({
      dataDays: dailies.length,
      hrvMs: mean(nums('hrvMs')),
      restingHr: mean(nums('restingHr')),
      sleepNeedMin:
        nums('sleepMinutes').length >= 5 && sleepMean !== null
          ? Math.min(570, Math.max(390, sleepMean))
          : 480,
      latestReadiness: latest?.readiness ?? null,
      latestSleepDebtMin: latest?.sleepDebtMin ?? null,
    });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
