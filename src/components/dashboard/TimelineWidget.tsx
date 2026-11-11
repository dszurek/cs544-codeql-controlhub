'use client';

import { useEffect, useState } from 'react';
import type { Task } from '@prisma/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { TaskTimeline } from '@/components/tasks/TaskTimeline';
import { useRouter } from 'next/navigation';

export function TimelineWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tasks?view=upcoming')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          const scheduled = (d.tasks ?? []).filter(
            (t: Task) => t.dueDate || t.startDate,
          );
          setTasks(scheduled);
        }
      })
      .catch(() => { /* quiet fail */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <GlassCard>
      <h2
        style={{
          fontFamily: 'var(--font-playfair)',
          color: 'var(--beige-light)',
          fontSize: '1.125rem',
          marginBottom: '0.75rem',
        }}
      >
        Upcoming timeline
      </h2>
      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>Loading…</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
          No scheduled tasks.
        </p>
      ) : (
        <TaskTimeline
          tasks={tasks}
          onOpen={(id) => router.push(`/tasks/${id}`)}
        />
      )}
    </GlassCard>
  );
}
