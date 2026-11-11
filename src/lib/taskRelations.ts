import { prisma } from './db';

/** Mark `taskId` as blocked by `blockerId`. Idempotent. Rejects self-cycles. */
export async function addBlocker(taskId: string, blockerId: string) {
  if (taskId === blockerId) {
    throw new Error('A task cannot block itself');
  }
  return prisma.taskBlocker.upsert({
    where: { taskId_blockerId: { taskId, blockerId } },
    create: { taskId, blockerId },
    update: {},
  });
}

export async function removeBlocker(taskId: string, blockerId: string) {
  await prisma.taskBlocker
    .delete({ where: { taskId_blockerId: { taskId, blockerId } } })
    .catch(() => undefined);
}

/** Returns IDs of tasks blocking this task (incomplete only). */
export async function getActiveBlockerIds(taskId: string): Promise<string[]> {
  const rows = await prisma.taskBlocker.findMany({
    where: { taskId },
    include: { blocker: { select: { id: true, status: true } } },
  });
  return rows
    .filter((r) => r.blocker.status !== 'completed' && r.blocker.status !== 'cancelled')
    .map((r) => r.blocker.id);
}

export async function getTaskGraph(taskId: string) {
  const [blockedBy, blocks, subtasks, comments, emailLinks, eventLinks] = await Promise.all([
    prisma.taskBlocker.findMany({
      where: { taskId },
      include: { blocker: true },
    }),
    prisma.taskBlocker.findMany({
      where: { blockerId: taskId },
      include: { task: true },
    }),
    prisma.task.findMany({
      where: { parentId: taskId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.taskEmailLink.findMany({ where: { taskId } }),
    prisma.taskEventLink.findMany({ where: { taskId } }),
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

  return {
    blockedBy: blockedBy.map((r) => r.blocker),
    blocks: blocks.map((r) => r.task),
    subtasks,
    comments,
    emails,
    events,
  };
}

export async function addComment(taskId: string, body: string) {
  return prisma.taskComment.create({ data: { taskId, body } });
}

export async function deleteComment(id: string) {
  await prisma.taskComment.delete({ where: { id } }).catch(() => undefined);
}

export async function linkTaskToEmail(taskId: string, emailId: string) {
  return prisma.taskEmailLink.upsert({
    where: { taskId_emailId: { taskId, emailId } },
    create: { taskId, emailId },
    update: {},
  });
}

export async function unlinkTaskFromEmail(taskId: string, emailId: string) {
  await prisma.taskEmailLink
    .delete({ where: { taskId_emailId: { taskId, emailId } } })
    .catch(() => undefined);
}

export async function linkTaskToEvent(taskId: string, eventId: string) {
  return prisma.taskEventLink.upsert({
    where: { taskId_eventId: { taskId, eventId } },
    create: { taskId, eventId },
    update: {},
  });
}

export async function unlinkTaskFromEvent(taskId: string, eventId: string) {
  await prisma.taskEventLink
    .delete({ where: { taskId_eventId: { taskId, eventId } } })
    .catch(() => undefined);
}
