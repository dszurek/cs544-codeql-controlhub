import { GET, POST } from '@/app/api/tasks/route';
import { PATCH, DELETE } from '@/app/api/tasks/[id]/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/tasks', () => ({
  getTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue({ id: 'task-1', title: 'Buy milk', status: 'pending', priority: 4, type: 'general', source: 'manual', createdAt: new Date() }),
  updateTask: vi.fn().mockResolvedValue({ id: 'task-1', title: 'Updated', status: 'completed' }),
  deleteTask: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    task: { findUnique: vi.fn().mockResolvedValue({ id: 'task-1', title: 'Buy milk' }) },
  },
}));

vi.mock('@/lib/taskRelations', () => ({
  getTaskGraph: vi.fn().mockResolvedValue({
    blockedBy: [],
    blocks: [],
    subtasks: [],
    comments: [],
    emails: [],
    events: [],
  }),
  getActiveBlockerIds: vi.fn().mockResolvedValue([]),
}));

import { getTasks, createTask, updateTask, deleteTask } from '@/lib/tasks';

describe('GET /api/tasks', () => {
  it('no params → returns { tasks: [] } with status 200', async () => {
    const req = new NextRequest('http://localhost/api/tasks');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ tasks: [] });
    expect(getTasks).toHaveBeenCalledWith({});
  });

  it('view=today&status=pending → calls getTasks with { view: "today", status: "pending" }', async () => {
    vi.mocked(getTasks).mockClear();
    const req = new NextRequest('http://localhost/api/tasks?view=today&status=pending');
    await GET(req);
    expect(getTasks).toHaveBeenCalledWith({ view: 'today', status: 'pending' });
  });

  it('priority=1&overdueOnly=true → calls getTasks with { priority: 1, overdueOnly: true }', async () => {
    vi.mocked(getTasks).mockClear();
    const req = new NextRequest('http://localhost/api/tasks?priority=1&overdueOnly=true');
    await GET(req);
    expect(getTasks).toHaveBeenCalledWith({ priority: 1, overdueOnly: true });
  });
});

describe('POST /api/tasks', () => {
  it('with { title: "Buy milk" } → returns 201 with { task: ... }', async () => {
    const req = new NextRequest('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Buy milk' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json).toHaveProperty('task');
    expect(json.task.title).toBe('Buy milk');
  });

  it('missing title → returns 400', async () => {
    const req = new NextRequest('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ notes: 'no title here' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'title is required' });
  });

  it('with dueDate ISO string → calls createTask with Date object', async () => {
    vi.mocked(createTask).mockClear();
    const isoDate = '2025-06-15T10:00:00.000Z';
    const req = new NextRequest('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Meeting', dueDate: isoDate }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: new Date(isoDate) }),
    );
  });
});

describe('PATCH /api/tasks/[id]', () => {
  it('with { status: "completed" } → returns 200 with { task: ... }', async () => {
    const req = new NextRequest('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'task-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty('task');
    expect(json.task.status).toBe('completed');
  });

  it('passes dueDate: null through to updateTask', async () => {
    const req = new NextRequest('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      body: JSON.stringify({ dueDate: null }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'task-1' }) });
    expect(updateTask).toHaveBeenCalledWith('task-1', { dueDate: null });
    expect(res.status).toBe(200);
  });

  it('empty body → returns 400', async () => {
    const req = new NextRequest('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'task-1' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'No fields to update' });
  });
});

describe('DELETE /api/tasks/[id]', () => {
  it('returns { ok: true } with 200', async () => {
    const req = new NextRequest('http://localhost/api/tasks/task-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'task-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(deleteTask).toHaveBeenCalledWith('task-1');
  });
});
