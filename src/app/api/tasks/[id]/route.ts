import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateTask, deleteTask } from '@/lib/tasks';
import { getTaskGraph, getActiveBlockerIds } from '@/lib/taskRelations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const graph = await getTaskGraph(id);
  return NextResponse.json({ task, ...graph });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    title,
    notes,
    description,
    type,
    priority,
    status,
    dueDate,
    dueTime,
    startDate,
    estimatedMinutes,
    courseId,
    recurrence,
    projectId,
    parentId,
    blockStart,
    blockEnd,
  } = body;

  const data: Parameters<typeof updateTask>[1] = {};

  if ('title' in body && typeof title === 'string') data.title = title;
  if ('notes' in body) data.notes = typeof notes === 'string' ? notes : null;
  if ('description' in body) data.description = typeof description === 'string' ? description : null;
  if ('type' in body && typeof type === 'string') data.type = type;
  if ('priority' in body && typeof priority === 'number') data.priority = priority;
  if ('status' in body && typeof status === 'string') data.status = status;
  if ('dueDate' in body) data.dueDate = dueDate !== null ? new Date(dueDate as string) : null;
  if ('dueTime' in body) data.dueTime = typeof dueTime === 'string' ? dueTime : null;
  if ('startDate' in body) data.startDate = startDate !== null ? new Date(startDate as string) : null;
  if ('estimatedMinutes' in body)
    data.estimatedMinutes = typeof estimatedMinutes === 'number' ? estimatedMinutes : null;
  if ('courseId' in body) data.courseId = typeof courseId === 'string' ? courseId : null;
  if ('recurrence' in body) data.recurrence = typeof recurrence === 'string' ? recurrence : null;
  if ('projectId' in body) data.projectId = typeof projectId === 'string' ? projectId : null;
  if ('parentId' in body) data.parentId = typeof parentId === 'string' ? parentId : null;
  if ('blockStart' in body)
    data.blockStart = blockStart !== null && typeof blockStart === 'string' ? new Date(blockStart) : null;
  if ('blockEnd' in body)
    data.blockEnd = blockEnd !== null && typeof blockEnd === 'string' ? new Date(blockEnd) : null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Block completion when active blockers remain
  if (data.status === 'completed') {
    const active = await getActiveBlockerIds(id);
    if (active.length > 0) {
      return NextResponse.json(
        { error: 'Task is blocked by incomplete prerequisite tasks', blockerIds: active },
        { status: 409 },
      );
    }
  }

  const task = await updateTask(id, data);
  return NextResponse.json({ task });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
