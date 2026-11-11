import { prisma } from './db';

const EXTERNAL_PREFIX = 'grade:';

function externalId(assignmentId: string): string {
  return `${EXTERNAL_PREFIX}${assignmentId}`;
}

export async function syncAssignmentToTask(assignmentId: string): Promise<void> {
  const assignment = await prisma.gradeAssignment.findUnique({
    where: { id: assignmentId },
    include: { class: true },
  });
  const extId = externalId(assignmentId);

  const shouldExist =
    !!assignment &&
    assignment.isUpcoming &&
    !!assignment.dueDate &&
    assignment.pointsEarned === null;

  if (!shouldExist) {
    await prisma.task.deleteMany({ where: { externalId: extId } });
    return;
  }

  const title = `${assignment.class.name} — ${assignment.name}`;
  const existing = await prisma.task.findUnique({ where: { externalId: extId } });
  if (existing) {
    await prisma.task.update({
      where: { id: existing.id },
      data: {
        title,
        dueDate: assignment.dueDate,
        courseId: assignment.class.code ?? assignment.class.name,
      },
    });
    return;
  }

  await prisma.task.create({
    data: {
      title,
      type: 'assignment',
      priority: 3,
      status: 'pending',
      dueDate: assignment.dueDate,
      courseId: assignment.class.code ?? assignment.class.name,
      source: 'grade_sync',
      externalId: extId,
    },
  });
}

export async function removeAssignmentTask(assignmentId: string): Promise<void> {
  await prisma.task.deleteMany({ where: { externalId: externalId(assignmentId) } });
}
