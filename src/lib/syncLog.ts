import { prisma } from './db';

export async function logSync(source: string, status: 'success' | 'error', error?: string): Promise<void> {
  await prisma.syncLog.create({
    data: {
      source,
      status,
      ...(error !== undefined ? { error } : {}),
    },
  });
}

export interface SyncStatus {
  source: string;
  syncedAt: Date;
  status: string;
  error: string | null;
}

export async function getLastSyncStatus(sources: string[]): Promise<Record<string, SyncStatus | null>> {
  const results = await Promise.all(
    sources.map((source) =>
      prisma.syncLog.findFirst({
        where: { source },
        orderBy: { syncedAt: 'desc' },
      }),
    ),
  );

  return Object.fromEntries(
    sources.map((source, i) => {
      const row = results[i];
      if (!row) return [source, null];
      return [
        source,
        {
          source: row.source,
          syncedAt: row.syncedAt,
          status: row.status,
          error: row.error,
        },
      ];
    }),
  );
}
