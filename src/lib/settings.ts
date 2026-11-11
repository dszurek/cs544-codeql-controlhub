import { prisma } from './db';

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const rows = await prisma.settings.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string | null> = Object.fromEntries(keys.map((k) => [k, null]));
  for (const row of rows) map[row.key] = row.value;
  return map;
}
