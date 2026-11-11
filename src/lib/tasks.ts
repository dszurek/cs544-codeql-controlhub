import { Task, Project, Prisma } from '@prisma/client';
import { prisma } from './db';

export interface GetTasksOptions {
  view?: 'today' | 'upcoming' | 'all' | 'priority';
  projectId?: string;
  type?: string;
  priority?: number;
  status?: string;
  overdueOnly?: boolean;
  aiPriorityOnly?: boolean;
  sort?: 'dueDate' | 'priority' | 'createdAt' | 'title';
  order?: 'asc' | 'desc';
  includeSnoozed?: boolean;
}

/**
 * Fetch tasks with optional filtering and sorting.
 *
 * Note: `overdueOnly: true` takes precedence — it forces `status: 'pending'`
 * and ignores the `view` option. Pass only one of these at a time.
 */
export async function getTasks(options: GetTasksOptions = {}): Promise<Task[]> {
  const { view, projectId, type, priority, status, overdueOnly, aiPriorityOnly, includeSnoozed, sort = 'createdAt', order = 'asc' } = options;

  const where: Prisma.TaskWhereInput = {};

  if (!includeSnoozed) {
    const now = new Date();
    where.OR = [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }];
  }

  if (overdueOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.dueDate = { lt: today };
    where.status = 'pending';
  } else if (view === 'priority' || aiPriorityOnly) {
    where.aiPriority = true;
    if (status !== undefined) where.status = status;
  } else {
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

    if (status !== undefined) where.status = status;
  }

  if (projectId !== undefined) where.projectId = projectId;
  if (type !== undefined) where.type = type;
  if (priority !== undefined) where.priority = priority;

  const orderBy = { [sort]: order } as Prisma.TaskOrderByWithRelationInput;

  return prisma.task.findMany({
    where,
    orderBy,
  });
}

export async function createTask(data: {
  title: string;
  notes?: string;
  description?: string;
  type?: string;
  priority?: number;
  dueDate?: Date;
  dueTime?: string;
  startDate?: Date;
  estimatedMinutes?: number;
  courseId?: string;
  recurrence?: string;
  projectId?: string;
  parentId?: string;
  source?: string;
  externalId?: string;
}): Promise<Task> {
  return prisma.task.create({ data });
}

/**
 * Update a task by id.
 *
 * `completedAt` is auto-managed: when `status` changes to `'completed'`,
 * `completedAt` is set to `new Date()` unless explicitly provided.
 * For any other status, `completedAt` is cleared to `null`.
 * Pass `completedAt` explicitly to override this behavior (e.g. data import).
 */
export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    notes: string | null;
    description: string | null;
    type: string;
    priority: number;
    status: string;
    dueDate: Date | null;
    dueTime: string | null;
    startDate: Date | null;
    estimatedMinutes: number | null;
    courseId: string | null;
    recurrence: string | null;
    projectId: string | null;
    parentId: string | null;
    completedAt: Date | null;
    blockStart: Date | null;
    blockEnd: Date | null;
  }>,
): Promise<Task> {
  const update = { ...data };

  if ('status' in update) {
    if (update.status === 'completed') {
      if (!('completedAt' in update)) {
        update.completedAt = new Date();
      }
    } else {
      update.completedAt = null;
    }
  }

  return prisma.task.update({ where: { id }, data: update });
}

export async function deleteTask(id: string): Promise<void> {
  await prisma.task.delete({ where: { id } });
}

export async function getProjects(): Promise<Project[]> {
  return prisma.project.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function createProject(data: {
  name: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}): Promise<Project> {
  return prisma.project.create({ data });
}
