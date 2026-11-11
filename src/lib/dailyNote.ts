import { prisma } from './db';

export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return isoDate(dt);
}

function extractIncompleteCheckboxLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s\[\s\]\s.+/.test(line));
}

export async function getOrCreateNote(date: string): Promise<{ id: string; date: string; body: string; migratedFrom?: string }> {
  const existing = await prisma.dailyNote.findUnique({ where: { date } });
  if (existing) return { id: existing.id, date: existing.date, body: existing.body };

  // Migrate incomplete checkboxes from yesterday
  const yesterday = addDays(date, -1);
  const yesterdayNote = await prisma.dailyNote.findUnique({ where: { date: yesterday } });
  let seedBody = '';
  if (yesterdayNote) {
    const carryOver = extractIncompleteCheckboxLines(yesterdayNote.body);
    if (carryOver.length > 0) {
      seedBody = `## Carried over from ${yesterday}\n${carryOver.join('\n')}\n\n`;
    }
  }
  const created = await prisma.dailyNote.create({ data: { date, body: seedBody } });
  return {
    id: created.id,
    date: created.date,
    body: created.body,
    migratedFrom: seedBody ? yesterday : undefined,
  };
}

export async function updateNote(date: string, body: string): Promise<void> {
  await prisma.dailyNote.update({ where: { date }, data: { body } });
}
