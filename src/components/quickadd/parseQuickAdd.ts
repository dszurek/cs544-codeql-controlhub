import * as chrono from 'chrono-node';

export interface Project {
  id: string;
  name: string;
}

export interface ParsedQuickAdd {
  title: string;
  priority: number;
  type: string;
  dueDate?: Date;
  dueTime?: string;
  projectId?: string;
  projectLabel?: string;
}

const VALID_TYPES = new Set(['general', 'assignment', 'homework', 'meeting', 'shopping']);

function extractDueTime(date: Date): string | undefined {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return undefined;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseQuickAdd(input: string, projects: Project[]): ParsedQuickAdd {
  let rest = input.trim();

  let priority = 4;
  const pMatch = rest.match(/(^|\s)p([1-4])(\s|$)/i);
  if (pMatch) {
    priority = parseInt(pMatch[2], 10);
    rest = (rest.slice(0, pMatch.index) + ' ' + rest.slice((pMatch.index ?? 0) + pMatch[0].length))
      .replace(/\s+/g, ' ')
      .trim();
  }

  let type = 'general';
  const typeMatch = rest.match(/(^|\s)@(\w+)/);
  if (typeMatch && VALID_TYPES.has(typeMatch[2].toLowerCase())) {
    type = typeMatch[2].toLowerCase();
    rest = (rest.slice(0, typeMatch.index) + ' ' + rest.slice((typeMatch.index ?? 0) + typeMatch[0].length))
      .replace(/\s+/g, ' ')
      .trim();
  }

  let projectId: string | undefined;
  let projectLabel: string | undefined;
  const projectMatch = rest.match(/(^|\s)#([a-z0-9_-]+)/i);
  if (projectMatch) {
    const slug = projectMatch[2].toLowerCase();
    const proj = projects.find(
      (p) => p.name.toLowerCase().replace(/\s+/g, '-') === slug || p.name.toLowerCase() === slug,
    );
    if (proj) {
      projectId = proj.id;
      projectLabel = proj.name;
      rest = (rest.slice(0, projectMatch.index) + ' ' + rest.slice((projectMatch.index ?? 0) + projectMatch[0].length))
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  const parsed = chrono.parse(rest, new Date(), { forwardDate: true });
  let dueDate: Date | undefined;
  let dueTime: string | undefined;
  if (parsed.length > 0) {
    const best = parsed[parsed.length - 1];
    dueDate = best.start.date();
    dueTime = extractDueTime(dueDate);
    rest = (rest.slice(0, best.index) + ' ' + rest.slice(best.index + best.text.length))
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    title: rest,
    priority,
    type,
    dueDate,
    dueTime,
    projectId,
    projectLabel,
  };
}
