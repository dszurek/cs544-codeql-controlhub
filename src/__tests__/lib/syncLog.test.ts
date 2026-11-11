import { logSync, getLastSyncStatus } from '@/lib/syncLog';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    syncLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── logSync ──────────────────────────────────────────────────────────────────

describe('logSync', () => {
  it('creates a success row without an error field', async () => {
    vi.mocked(prisma.syncLog.create).mockResolvedValue({} as any);

    await logSync('outlook', 'success');

    expect(prisma.syncLog.create).toHaveBeenCalledWith({
      data: { source: 'outlook', status: 'success' },
    });
  });

  it('creates an error row with the error field set', async () => {
    vi.mocked(prisma.syncLog.create).mockResolvedValue({} as any);

    await logSync('gmail', 'error', 'Token expired');

    expect(prisma.syncLog.create).toHaveBeenCalledWith({
      data: { source: 'gmail', status: 'error', error: 'Token expired' },
    });
  });
});

// ─── getLastSyncStatus ────────────────────────────────────────────────────────

describe('getLastSyncStatus', () => {
  it('returns the most recent sync row for each source', async () => {
    const outlookRow = {
      id: 'sl1',
      source: 'outlook',
      syncedAt: new Date('2025-01-10T10:00:00Z'),
      status: 'success',
      error: null,
    };
    const gmailRow = {
      id: 'sl2',
      source: 'gmail',
      syncedAt: new Date('2025-01-10T11:00:00Z'),
      status: 'error',
      error: 'Rate limited',
    };

    vi.mocked(prisma.syncLog.findFirst)
      .mockResolvedValueOnce(outlookRow as any)
      .mockResolvedValueOnce(gmailRow as any);

    const result = await getLastSyncStatus(['outlook', 'gmail']);

    expect(prisma.syncLog.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.syncLog.findFirst).toHaveBeenCalledWith({
      where: { source: 'outlook' },
      orderBy: { syncedAt: 'desc' },
    });
    expect(prisma.syncLog.findFirst).toHaveBeenCalledWith({
      where: { source: 'gmail' },
      orderBy: { syncedAt: 'desc' },
    });

    expect(result).toEqual({
      outlook: {
        source: 'outlook',
        syncedAt: outlookRow.syncedAt,
        status: 'success',
        error: null,
      },
      gmail: {
        source: 'gmail',
        syncedAt: gmailRow.syncedAt,
        status: 'error',
        error: 'Rate limited',
      },
    });
  });

  it('returns null for sources with no sync log entry', async () => {
    vi.mocked(prisma.syncLog.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await getLastSyncStatus(['icloud', 'homeassistant']);

    expect(result).toEqual({ icloud: null, homeassistant: null });
  });

  it('handles a mix of found and missing sources', async () => {
    const icloudRow = {
      id: 'sl3',
      source: 'icloud',
      syncedAt: new Date('2025-01-09T08:00:00Z'),
      status: 'success',
      error: null,
    };

    vi.mocked(prisma.syncLog.findFirst)
      .mockResolvedValueOnce(icloudRow as any)
      .mockResolvedValueOnce(null);

    const result = await getLastSyncStatus(['icloud', 'homeassistant']);

    expect(result.icloud).toEqual({
      source: 'icloud',
      syncedAt: icloudRow.syncedAt,
      status: 'success',
      error: null,
    });
    expect(result.homeassistant).toBeNull();
  });
});
