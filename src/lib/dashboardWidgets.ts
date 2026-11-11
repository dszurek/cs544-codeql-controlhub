import { getSetting, setSetting } from './settings';

export interface WidgetDef {
  id: string;
  label: string;
  description: string;
}

export const DASHBOARD_WIDGETS: WidgetDef[] = [
  { id: 'signals', label: 'Signals', description: 'AI-generated insights feed (Cortex)' },
  { id: 'clock', label: 'Clock', description: 'Analog clock and date' },
  { id: 'weather', label: 'Weather', description: 'Current conditions + 12-hour forecast' },
  { id: 'briefing', label: 'AI Briefing', description: 'Morning/evening briefing summary' },
  { id: 'shutdown', label: 'Shutdown Ritual', description: 'Nightly triage (appears at 9pm)' },
  { id: 'todayEvents', label: 'Mission Timeline', description: 'Events, deadlines, work blocks, and the now-line' },
  { id: 'todayTasks', label: 'Today Tasks', description: 'Tasks due today' },
  { id: 'productivity', label: 'Productivity', description: 'Completion stats and streaks' },
  { id: 'focus', label: 'Focus Timer', description: 'Pomodoro timer with focus/break cycles' },
  { id: 'habits', label: 'Habits', description: 'Daily habit checklist with streaks' },
  { id: 'dailyNote', label: 'Daily Note', description: 'Journal; incomplete checkboxes roll over' },
  { id: 'timeline', label: 'Upcoming Timeline', description: 'Gantt-style timeline of scheduled tasks' },
  { id: 'slipping', label: "What's Slipping", description: 'Overdue and stalled tasks needing attention' },
  { id: 'mail', label: 'Mail Badges', description: 'Unread counts per account' },
  { id: 'github', label: 'GitHub', description: 'Recent commits and PRs' },
  { id: 'scenes', label: 'Smart Home Scenes', description: 'Quick scene triggers' },
];

export const WIDGET_IDS = DASHBOARD_WIDGETS.map((w) => w.id);

const DEFAULT_ENABLED: Record<string, boolean> = {
  signals: true,
  clock: true,
  weather: true,
  briefing: true,
  shutdown: true,
  todayEvents: true,
  todayTasks: true,
  productivity: true,
  focus: true,
  habits: true,
  dailyNote: false,
  timeline: false,
  slipping: true,
  mail: true,
  github: true,
  scenes: true,
};

export async function getWidgetVisibility(): Promise<Record<string, boolean>> {
  const raw = await getSetting('dashboard_widgets');
  if (!raw) return { ...DEFAULT_ENABLED };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_ENABLED };
    const out: Record<string, boolean> = { ...DEFAULT_ENABLED };
    for (const id of WIDGET_IDS) {
      if (typeof parsed[id] === 'boolean') out[id] = parsed[id];
    }
    return out;
  } catch {
    return { ...DEFAULT_ENABLED };
  }
}

export async function setWidgetVisibility(map: Record<string, boolean>): Promise<void> {
  const sanitized: Record<string, boolean> = {};
  for (const id of WIDGET_IDS) {
    sanitized[id] = map[id] !== false;
  }
  await setSetting('dashboard_widgets', JSON.stringify(sanitized));
}

/**
 * Merge a saved order with the canonical widget list: keep known saved
 * ids in their saved order, then append any widgets the save predates
 * (new widgets never silently vanish). Pure so it's unit-tested.
 */
export function mergeOrder(saved: unknown): string[] {
  const valid = new Set(WIDGET_IDS);
  const seen = new Set<string>();
  const ordered: string[] = [];
  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (typeof id === 'string' && valid.has(id) && !seen.has(id)) {
        ordered.push(id);
        seen.add(id);
      }
    }
  }
  for (const id of WIDGET_IDS) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

export async function getWidgetOrder(): Promise<string[]> {
  const raw = await getSetting('dashboard_order');
  if (!raw) return [...WIDGET_IDS];
  try {
    return mergeOrder(JSON.parse(raw));
  } catch {
    return [...WIDGET_IDS];
  }
}

export async function setWidgetOrder(order: string[]): Promise<void> {
  await setSetting('dashboard_order', JSON.stringify(mergeOrder(order)));
}

/** Sort items carrying a widget `id` by the saved order; unknown ids sink last. */
export function sortByOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
}
