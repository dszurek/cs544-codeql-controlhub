import { getTasks, createTask, updateTask, deleteTask, getProjects, createProject } from '@/lib/tasks';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getTasks ────────────────────────────────────────────────────────────────

describe('getTasks', () => {
  it('with no options calls findMany with empty where and default orderBy', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasks();
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: expect.any(Date) } }] },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('view: today filters dueDate to today only', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasks({ view: 'today' });

    const call = vi.mocked(prisma.task.findMany).mock.calls[0][0]!;
    const { gte, lt } = (call.where as any).dueDate;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    expect(gte.getTime()).toBe(startOfToday.getTime());
    expect(lt.getTime()).toBe(startOfTomorrow.getTime());
  });

  it('view: upcoming filters dueDate to next 7 days', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasks({ view: 'upcoming' });

    const call = vi.mocked(prisma.task.findMany).mock.calls[0][0]!;
    const { gte, lt } = (call.where as any).dueDate;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(startOfToday);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    expect(gte.getTime()).toBe(startOfToday.getTime());
    expect(lt.getTime()).toBe(sevenDaysLater.getTime());
  });

  it('passes status and priority filters', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasks({ status: 'pending', priority: 1 });
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { status: 'pending', priority: 1, OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: expect.any(Date) } }] },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('overdueOnly filters dueDate < today and status pending', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasks({ overdueOnly: true });

    const call = vi.mocked(prisma.task.findMany).mock.calls[0][0]!;
    const where = call.where as any;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    expect(where.status).toBe('pending');
    expect(where.dueDate.lt.getTime()).toBe(startOfToday.getTime());
  });

  it('passes custom sort and order', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasks({ sort: 'priority', order: 'desc' });
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: expect.any(Date) } }] },
      orderBy: { priority: 'desc' },
    });
  });
});

// ─── createTask ──────────────────────────────────────────────────────────────

describe('createTask', () => {
  it('calls prisma.task.create with the provided data', async () => {
    const mockTask = { id: 'abc', title: 'Buy milk' } as any;
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask);

    const result = await createTask({ title: 'Buy milk' });

    expect(prisma.task.create).toHaveBeenCalledWith({ data: { title: 'Buy milk' } });
    expect(result).toBe(mockTask);
  });
});

// ─── updateTask ──────────────────────────────────────────────────────────────

describe('updateTask', () => {
  it('auto-sets completedAt when status is completed', async () => {
    const mockTask = { id: 'abc', status: 'completed' } as any;
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask);

    const before = new Date();
    await updateTask('abc', { status: 'completed' });
    const after = new Date();

    const call = vi.mocked(prisma.task.update).mock.calls[0][0];
    const completedAt: Date = (call.data as any).completedAt;

    expect(completedAt).toBeInstanceOf(Date);
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('sets completedAt to null when status is not completed', async () => {
    const mockTask = { id: 'abc', status: 'pending' } as any;
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask);

    await updateTask('abc', { status: 'pending' });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'abc' },
      data: { status: 'pending', completedAt: null },
    });
  });
});

// ─── deleteTask ──────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('calls prisma.task.delete with the correct id', async () => {
    vi.mocked(prisma.task.delete).mockResolvedValue({} as any);
    await deleteTask('xyz');
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'xyz' } });
  });
});

// ─── getProjects ─────────────────────────────────────────────────────────────

describe('getProjects', () => {
  it('returns projects ordered by sortOrder asc', async () => {
    const mockProjects = [{ id: '1', name: 'Work', sortOrder: 0 }] as any;
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    const result = await getProjects();

    expect(prisma.project.findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: 'asc' } });
    expect(result).toBe(mockProjects);
  });
});

// ─── createProject ───────────────────────────────────────────────────────────

describe('createProject', () => {
  it('calls prisma.project.create with the provided data', async () => {
    const mockProject = { id: '1', name: 'Work' } as any;
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const result = await createProject({ name: 'Work' });

    expect(prisma.project.create).toHaveBeenCalledWith({ data: { name: 'Work' } });
    expect(result).toBe(mockProject);
  });
});
