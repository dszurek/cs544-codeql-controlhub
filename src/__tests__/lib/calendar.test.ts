import { getEvents, upsertEvent, deleteEventsBySource } from '@/lib/calendar';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    calendarEvent: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getEvents ────────────────────────────────────────────────────────────────

describe('getEvents', () => {
  it('with no options calls findMany with empty where and startAt asc order', async () => {
    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    await getEvents();
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { startAt: 'asc' },
    });
  });

  it('filters by source', async () => {
    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    await getEvents({ source: 'outlook' });
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({
      where: { source: 'outlook' },
      orderBy: { startAt: 'asc' },
    });
  });

  it('filters by startDate using gte', async () => {
    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    const startDate = new Date('2025-01-01');
    await getEvents({ startDate });
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({
      where: { startAt: { gte: startDate } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('filters by endDate using lte', async () => {
    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    const endDate = new Date('2025-01-31');
    await getEvents({ endDate });
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({
      where: { startAt: { lte: endDate } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('combines source, startDate, and endDate filters', async () => {
    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');
    await getEvents({ source: 'icloud', startDate, endDate });
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({
      where: { source: 'icloud', startAt: { gte: startDate, lte: endDate } },
      orderBy: { startAt: 'asc' },
    });
  });
});

// ─── upsertEvent ──────────────────────────────────────────────────────────────

describe('upsertEvent', () => {
  it('calls prisma.calendarEvent.upsert with correct where, create, and update', async () => {
    const mockEvent = { id: 'evt1', title: 'Team Standup' } as any;
    vi.mocked(prisma.calendarEvent.upsert).mockResolvedValue(mockEvent);

    const data = {
      title: 'Team Standup',
      startAt: new Date('2025-01-15T09:00:00Z'),
      endAt: new Date('2025-01-15T09:30:00Z'),
      allDay: false,
      source: 'outlook',
      sourceId: 'evt-abc-123',
      calendarName: 'Work',
      color: '#0078d4',
    };

    const result = await upsertEvent(data);

    expect(prisma.calendarEvent.upsert).toHaveBeenCalledWith({
      where: { source_sourceId: { source: 'outlook', sourceId: 'evt-abc-123' } },
      create: {
        source: 'outlook',
        sourceId: 'evt-abc-123',
        title: 'Team Standup',
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: false,
        calendarName: 'Work',
        color: '#0078d4',
      },
      update: {
        title: 'Team Standup',
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: false,
        calendarName: 'Work',
        color: '#0078d4',
      },
    });
    expect(result).toBe(mockEvent);
  });
});

// ─── deleteEventsBySource ─────────────────────────────────────────────────────

describe('deleteEventsBySource', () => {
  it('calls prisma.calendarEvent.deleteMany with the correct source filter', async () => {
    vi.mocked(prisma.calendarEvent.deleteMany).mockResolvedValue({ count: 5 });
    await deleteEventsBySource('icloud');
    expect(prisma.calendarEvent.deleteMany).toHaveBeenCalledWith({ where: { source: 'icloud' } });
  });
});
