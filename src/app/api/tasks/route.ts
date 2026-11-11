import { NextRequest, NextResponse } from 'next/server';
import { getTasks, createTask } from '@/lib/tasks';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const options: Parameters<typeof getTasks>[0] = {};

  const view = sp.get('view');
  if (view === 'today' || view === 'upcoming' || view === 'all' || view === 'priority') options.view = view;

  const projectId = sp.get('projectId');
  if (projectId) options.projectId = projectId;

  const type = sp.get('type');
  if (type) options.type = type;

  const priorityStr = sp.get('priority');
  if (priorityStr) {
    const p = parseInt(priorityStr, 10);
    if (Number.isFinite(p)) options.priority = p;
  }

  const status = sp.get('status');
  if (status) options.status = status;

  const overdueOnly = sp.get('overdueOnly');
  if (overdueOnly === 'true') options.overdueOnly = true;

  const sort = sp.get('sort');
  if (sort === 'dueDate' || sort === 'priority' || sort === 'createdAt' || sort === 'title') options.sort = sort;

  const order = sp.get('order');
  if (order === 'asc' || order === 'desc') options.order = order;

  const includeSnoozed = sp.get('includeSnoozed');
  if (includeSnoozed === 'true') options.includeSnoozed = true;

  const tasks = await getTasks(options);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
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
    dueDate,
    dueTime,
    startDate,
    estimatedMinutes,
    courseId,
    recurrence,
    projectId,
    parentId,
  } = body;

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const task = await createTask({
    title: typeof title === 'string' ? title : String(title),
    notes: typeof notes === 'string' ? notes : undefined,
    description: typeof description === 'string' ? description : undefined,
    type: typeof type === 'string' ? type : undefined,
    priority: typeof priority === 'number' ? priority : undefined,
    dueDate: dueDate ? new Date(dueDate as string) : undefined,
    dueTime: typeof dueTime === 'string' ? dueTime : undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    estimatedMinutes: typeof estimatedMinutes === 'number' ? estimatedMinutes : undefined,
    courseId: typeof courseId === 'string' ? courseId : undefined,
    recurrence: typeof recurrence === 'string' ? recurrence : undefined,
    projectId: typeof projectId === 'string' ? projectId : undefined,
    parentId: typeof parentId === 'string' ? parentId : undefined,
  });

  return NextResponse.json({ task }, { status: 201 });
}
