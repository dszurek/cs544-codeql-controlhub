import { prisma } from './db';
import { createTask } from './tasks';
import { addBlocker } from './taskRelations';

export interface TemplateItem {
  title: string;
  priority?: number;
  type?: string;
  estimatedMinutes?: number;
  dueOffsetDays?: number;
  notes?: string;
  parentIndex?: number;
  blockerIndices?: number[];
}

function parseItems(raw: string): TemplateItem[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function listTemplates() {
  const rows = await prisma.taskTemplate.findMany({ orderBy: { name: 'asc' } });
  return rows.map((r) => ({ ...r, items: parseItems(r.items) }));
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  items: TemplateItem[];
}) {
  const row = await prisma.taskTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      items: JSON.stringify(data.items),
    },
  });
  return { ...row, items: parseItems(row.items) };
}

export async function updateTemplate(
  id: string,
  data: Partial<{ name: string; description: string | null; items: TemplateItem[] }>,
) {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.items !== undefined) update.items = JSON.stringify(data.items);
  const row = await prisma.taskTemplate.update({ where: { id }, data: update });
  return { ...row, items: parseItems(row.items) };
}

export async function deleteTemplate(id: string) {
  await prisma.taskTemplate.delete({ where: { id } }).catch(() => undefined);
}

/**
 * Instantiate a template. Items become tasks. `parentIndex` wires up subtask
 * parents, `blockerIndices` wires up blocker relationships — both reference
 * earlier items by zero-based position.
 */
export async function applyTemplate(
  id: string,
  opts: { anchorDate?: Date; projectId?: string } = {},
) {
  const template = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!template) throw new Error('Template not found');
  const items = parseItems(template.items);
  const anchor = opts.anchorDate ?? new Date();

  const createdIds: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const parentId =
      item.parentIndex !== undefined && item.parentIndex >= 0 && item.parentIndex < i
        ? createdIds[item.parentIndex]
        : undefined;
    let dueDate: Date | undefined;
    if (typeof item.dueOffsetDays === 'number') {
      dueDate = new Date(anchor);
      dueDate.setDate(dueDate.getDate() + item.dueOffsetDays);
    }
    const created = await createTask({
      title: item.title,
      priority: item.priority ?? 3,
      type: item.type ?? 'general',
      estimatedMinutes: item.estimatedMinutes,
      notes: item.notes,
      dueDate,
      parentId,
      projectId: opts.projectId,
    });
    createdIds.push(created.id);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.blockerIndices) continue;
    for (const b of item.blockerIndices) {
      if (b >= 0 && b < i) {
        await addBlocker(createdIds[i], createdIds[b]);
      }
    }
  }

  return { ids: createdIds };
}
