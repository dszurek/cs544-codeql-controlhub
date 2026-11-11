'use client';

import { useEffect, useRef, useState } from 'react';
import {
  assignLanes,
  computeRange,
  minutesIntoDay,
  type Interval,
} from './timelineLayout';

const HOUR_PX = 60;
const GUTTER_REM = 2.9; // hour-label gutter

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  allDay?: boolean;
  source: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueTime?: string | null;
}

function dayBounds(now: Date): { startISO: string; endISO: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

interface FlowBlock {
  taskId: string;
  title: string;
  priority: number;
  start: string;
  end: string;
  pinned: boolean;
  source: string;
}

export function DayTimeline() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<FlowBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [nowMin, setNowMin] = useState(() => minutesIntoDay(new Date()));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const { startISO, endISO } = dayBounds(new Date());

    Promise.all([
      fetch(`/api/calendar?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`)
        .then((r) => (r.ok ? r.json() : { events: [] }))
        .catch(() => ({ events: [] })),
      fetch('/api/tasks?view=today')
        .then((r) => (r.ok ? r.json() : { tasks: [] }))
        .catch(() => ({ tasks: [] })),
      fetch('/api/flow/today')
        .then((r) => (r.ok ? r.json() : { blocks: [] }))
        .catch(() => ({ blocks: [] })),
    ]).then(([ev, tk, fl]) => {
      if (cancelled) return;
      setEvents(ev.events ?? []);
      setTasks((tk.tasks ?? []).filter((t: Task) => t.status === 'pending' && t.dueTime));
      setBlocks(fl.blocks ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function replan() {
    setPlanning(true);
    try {
      const res = await fetch('/api/flow/replan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks ?? []);
      }
    } finally {
      setPlanning(false);
    }
  }

  function togglePin(block: FlowBlock) {
    setBlocks((prev) =>
      prev.map((b) => (b.taskId === block.taskId ? { ...b, pinned: !block.pinned } : b)),
    );
    fetch(`/api/flow/blocks/${block.taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !block.pinned }),
    }).catch(() => { /* next replan reconciles */ });
  }

  useEffect(() => {
    const id = setInterval(() => setNowMin(minutesIntoDay(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);

  const intervals: Interval[] = timed.map((e) => {
    const s = minutesIntoDay(new Date(e.start));
    const rawEnd = minutesIntoDay(new Date(e.end));
    return { startMin: s, endMin: Math.max(rawEnd, s + 25) }; // min visual height
  });

  const taskMins = tasks.map((t) => {
    const [h, m] = (t.dueTime as string).split(':').map(Number);
    return h * 60 + (m || 0);
  });

  const blockIntervals: Interval[] = blocks.map((b) => ({
    startMin: minutesIntoDay(new Date(b.start)),
    endMin: Math.max(minutesIntoDay(new Date(b.end)), minutesIntoDay(new Date(b.start)) + 25),
  }));

  const { startHour, endHour } = computeRange([
    ...intervals,
    ...blockIntervals,
    ...taskMins.map((m) => ({ startMin: m, endMin: m })),
  ]);
  const lanes = assignLanes(intervals);
  const canvasH = (endHour - startHour) * HOUR_PX;
  const yFor = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX;
  const nowVisible = nowMin >= startHour * 60 && nowMin <= endHour * 60;

  // Center the now-line on first paint
  useEffect(() => {
    if (loading || !scrollRef.current || !nowVisible) return;
    const el = scrollRef.current;
    el.scrollTop = Math.max(0, yFor(nowMin) - el.clientHeight / 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return (
      <div>
        <span className="skeleton" style={{ height: 14, width: '40%', marginBottom: 12 }} />
        <span className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="section-label" style={{ marginBottom: 0 }}>Mission timeline</h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="readout" style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
            <span className="pulse-live" style={{ marginRight: 8 }} />
            {timed.length} event{timed.length === 1 ? '' : 's'} · {blocks.length} block{blocks.length === 1 ? '' : 's'} · {tasks.length} deadline{tasks.length === 1 ? '' : 's'}
          </span>
          <button className="btn-glow" onClick={() => void replan()} disabled={planning}>
            {planning ? 'planning…' : '⚡ Plan day'}
          </button>
        </span>
      </div>

      {allDay.length > 0 && (
        <div className="tl-allday" style={{ marginTop: '0.75rem' }}>
          {allDay.map((e) => (
            <span key={e.id} className="tl-allday-chip">{e.title}</span>
          ))}
        </div>
      )}

      {timed.length === 0 && tasks.length === 0 && blocks.length === 0 ? (
        <div className="tl-empty">
          <span className="readout">── clear horizon ──</span>
          Nothing scheduled today. The day is yours.
        </div>
      ) : (
        <div className="tl-scroll" ref={scrollRef} style={{ marginTop: '0.75rem' }}>
          <div className="tl-canvas" style={{ height: canvasH }}>
            {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
              <div key={i} className="tl-hour" style={{ top: i * HOUR_PX }}>
                <span className="tl-hour-label">
                  {String(startHour + i).padStart(2, '0')}:00
                </span>
              </div>
            ))}

            {timed.map((e, i) => {
              const { lane, lanes: laneCount } = lanes[i];
              const iv = intervals[i];
              const widthPct = 100 / laneCount;
              return (
                <div
                  key={e.id}
                  className={`tl-event reveal src-${e.source}`}
                  title={e.location ? `${e.title} — ${e.location}` : e.title}
                  style={{
                    top: yFor(iv.startMin),
                    height: Math.max(yFor(iv.endMin) - yFor(iv.startMin) - 2, 22),
                    left: `calc(${GUTTER_REM}rem + (100% - ${GUTTER_REM}rem) * ${(lane * widthPct) / 100})`,
                    width: `calc((100% - ${GUTTER_REM}rem) * ${widthPct / 100} - 4px)`,
                    ['--reveal-i' as string]: i,
                  }}
                >
                  <span className="tl-event-time">
                    {new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {e.title}
                </div>
              );
            })}

            {blocks.map((b, i) => {
              const iv = blockIntervals[i];
              return (
                <div
                  key={b.taskId}
                  className={`tl-flow reveal${b.pinned ? ' pinned' : ''}`}
                  style={{
                    top: yFor(iv.startMin),
                    height: Math.max(yFor(iv.endMin) - yFor(iv.startMin) - 2, 22),
                    left: `calc(${GUTTER_REM}rem + 8px)`,
                    right: '4px',
                    ['--reveal-i' as string]: timed.length + i,
                  }}
                >
                  <span className="tl-event-time">
                    {new Date(b.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {' · '}P{b.priority}
                  </span>
                  {b.title}
                  <button
                    className="tl-pin"
                    aria-label={b.pinned ? 'Unpin block' : 'Pin block'}
                    title={b.pinned ? 'Pinned — replan keeps this' : 'Pin so replan keeps this'}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(b);
                    }}
                  >
                    {b.pinned ? '⏚' : '⌖'}
                  </button>
                </div>
              );
            })}

            {tasks.map((t, i) => (
              <div
                key={t.id}
                className="tl-task reveal"
                style={{
                  top: yFor(taskMins[i]) - 4,
                  left: `calc(${GUTTER_REM}rem + 4px)`,
                  ['--reveal-i' as string]: timed.length + i,
                }}
              >
                <span className="tl-task-marker" />
                {t.title}
              </div>
            ))}

            {nowVisible && <div className="tl-now" style={{ top: yFor(nowMin) }} />}
          </div>
        </div>
      )}
    </div>
  );
}
