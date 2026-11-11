import { getEmails, upsertEmail, markEmailRead, getUnreadCounts } from '@/lib/mail';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    email: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    emailRule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getEmails ────────────────────────────────────────────────────────────────

describe('getEmails', () => {
  it('with no options calls findMany with empty where and receivedAt desc order', async () => {
    vi.mocked(prisma.email.findMany).mockResolvedValue([]);
    await getEmails();
    expect(prisma.email.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { receivedAt: 'desc' },
    });
  });

  it('filters by source', async () => {
    vi.mocked(prisma.email.findMany).mockResolvedValue([]);
    await getEmails({ source: 'gmail' });
    expect(prisma.email.findMany).toHaveBeenCalledWith({
      where: { source: 'gmail' },
      orderBy: { receivedAt: 'desc' },
    });
  });

  it('filters by isRead', async () => {
    vi.mocked(prisma.email.findMany).mockResolvedValue([]);
    await getEmails({ isRead: false });
    expect(prisma.email.findMany).toHaveBeenCalledWith({
      where: { isRead: false },
      orderBy: { receivedAt: 'desc' },
    });
  });

  it('filters by both source and isRead', async () => {
    vi.mocked(prisma.email.findMany).mockResolvedValue([]);
    await getEmails({ source: 'outlook', isRead: true });
    expect(prisma.email.findMany).toHaveBeenCalledWith({
      where: { source: 'outlook', isRead: true },
      orderBy: { receivedAt: 'desc' },
    });
  });
});

// ─── upsertEmail ──────────────────────────────────────────────────────────────

describe('upsertEmail', () => {
  it('calls prisma.email.upsert with correct where, create, and update', async () => {
    const mockEmail = { id: 'em1', subject: 'Hello' } as any;
    vi.mocked(prisma.email.upsert).mockResolvedValue(mockEmail);

    const data = {
      subject: 'Hello',
      senderName: 'Alice',
      senderEmail: 'alice@example.com',
      preview: 'Hi there...',
      isRead: false,
      receivedAt: new Date('2025-01-10T08:00:00Z'),
      source: 'outlook',
      sourceId: 'msg-xyz-456',
    };

    const result = await upsertEmail(data);

    expect(prisma.email.upsert).toHaveBeenCalledWith({
      where: { source_sourceId: { source: 'outlook', sourceId: 'msg-xyz-456' } },
      create: {
        source: 'outlook',
        sourceId: 'msg-xyz-456',
        subject: 'Hello',
        senderName: 'Alice',
        senderEmail: 'alice@example.com',
        preview: 'Hi there...',
        isRead: false,
        receivedAt: data.receivedAt,
      },
      update: {
        subject: 'Hello',
        senderName: 'Alice',
        senderEmail: 'alice@example.com',
        preview: 'Hi there...',
        isRead: false,
        receivedAt: data.receivedAt,
      },
    });
    expect(result).toBe(mockEmail);
  });
});

// ─── markEmailRead ────────────────────────────────────────────────────────────

describe('markEmailRead', () => {
  it('calls prisma.email.update with correct id and isRead=true', async () => {
    const mockEmail = { id: 'em1', isRead: true } as any;
    vi.mocked(prisma.email.update).mockResolvedValue(mockEmail);

    const result = await markEmailRead('em1', true);

    expect(prisma.email.update).toHaveBeenCalledWith({
      where: { id: 'em1' },
      data: { isRead: true },
    });
    expect(result).toBe(mockEmail);
  });

  it('calls prisma.email.update with isRead=false', async () => {
    const mockEmail = { id: 'em2', isRead: false } as any;
    vi.mocked(prisma.email.update).mockResolvedValue(mockEmail);

    await markEmailRead('em2', false);

    expect(prisma.email.update).toHaveBeenCalledWith({
      where: { id: 'em2' },
      data: { isRead: false },
    });
  });
});

// ─── getUnreadCounts ──────────────────────────────────────────────────────────

describe('getUnreadCounts', () => {
  it('calls prisma.email.count twice and returns counts keyed by source', async () => {
    vi.mocked(prisma.email.count)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);

    const result = await getUnreadCounts();

    expect(prisma.email.count).toHaveBeenCalledTimes(2);
    expect(prisma.email.count).toHaveBeenCalledWith({
      where: { source: 'outlook', isRead: false },
    });
    expect(prisma.email.count).toHaveBeenCalledWith({
      where: { source: 'gmail', isRead: false },
    });
    expect(result).toEqual({ outlook: 3, gmail: 7 });
  });
});
