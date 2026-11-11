/** Pure bucketing logic for the Horizon board — kept separate for testing. */

export interface HorizonTask {
  id: string;
  title: string;
  priority: 1 | 2 | 3 | 4;
  status: string;
  dueDate?: string | null;
  dueTime?: string | null;
  parentId?: string | null;
  projectId?: string | null;
}

export interface HorizonBuckets<T> {
  now: T[];
  next: T[];
  later: T[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function endOfToday(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
}

/**
 * Now    — overdue or due today
 * Next   — due within the following 7 days
 * Later  — everything else, including undated tasks
 * Subtasks and non-pending tasks are excluded; each bucket is sorted by
 * due date, then priority.
 */
export function bucketTasks<T extends HorizonTask>(
  tasks: T[],
  now: Date = new Date(),
): HorizonBuckets<T> {
  const todayEnd = endOfToday(now);
  const nextEnd = todayEnd + 7 * DAY_MS;

  const buckets: HorizonBuckets<T> = { now: [], next: [], later: [] };

  for (const t of tasks) {
    if (t.status !== 'pending' || t.parentId) continue;
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    if (due !== null && due <= todayEnd) buckets.now.push(t);
    else if (due !== null && due <= nextEnd) buckets.next.push(t);
    else buckets.later.push(t);
  }

  const byDueThenPriority = (a: T, b: T) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (da !== db) return da - db;
    return a.priority - b.priority;
  };
  buckets.now.sort(byDueThenPriority);
  buckets.next.sort(byDueThenPriority);
  buckets.later.sort((a, b) => a.priority - b.priority);

  return buckets;
}

export function isOverdue(t: HorizonTask, now: Date = new Date()): boolean {
  if (!t.dueDate) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return new Date(t.dueDate).getTime() < startOfToday;
}

export function formatDue(t: HorizonTask): string {
  if (!t.dueDate) return 'no date';
  const d = new Date(t.dueDate);
  const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return t.dueTime ? `${label} ${t.dueTime}` : label;
}
