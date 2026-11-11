'use client';

import { useState, useEffect } from 'react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import type { TaskBlock } from './DayView';
import { EventDetail } from './EventDetail';
import type { CalendarEventData } from './EventDetail';

type ViewType = 'month' | 'week' | 'day';

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateRange(view: ViewType, date: Date): { startDate: Date; endDate: Date } {
  if (view === 'month') {
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { startDate, endDate };
  }
  if (view === 'week') {
    const startDate = getMondayOfWeek(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  // day
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

function formatPeriodLabel(view: ViewType, date: Date): string {
  if (view === 'month') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const monday = getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }
  // day
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function navigateDate(view: ViewType, date: Date, direction: -1 | 1): Date {
  const d = new Date(date);
  if (view === 'month') {
    d.setMonth(d.getMonth() + direction);
  } else if (view === 'week') {
    d.setDate(d.getDate() + direction * 7);
  } else {
    d.setDate(d.getDate() + direction);
  }
  return d;
}

const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

export function CalendarView() {
  const [view, setView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [taskBlocks, setTaskBlocks] = useState<TaskBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    const { startDate, endDate } = getDateRange(view, selectedDate);
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const blockParams = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    Promise.all([
      fetch(`/api/calendar?${params.toString()}`, { signal: controller.signal }).then((r) => r.json()),
      fetch(`/api/tasks/blocks?${blockParams.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .catch(() => ({ blocks: [] })),
    ])
      .then(([calData, blockData]) => {
        setEvents(calData.events ?? []);
        setTaskBlocks(blockData.blocks ?? []);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Failed to load calendar events.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedDate.toISOString().slice(0, 10)]);

  function handleSelectDay(date: Date) {
    setSelectedDate(date);
    setView('day');
  }

  return (
    <div>
      <div className="surface-head reveal">
        <h1 className="surface-title">Calendar</h1>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Segmented control */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(42, 47, 53, 0.40)',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px',
          }}
        >
          {VIEWS.map((v) => {
            const isActive = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  background: isActive ? 'var(--leather)' : 'transparent',
                  color: isActive ? 'var(--beige-light)' : 'rgba(216, 204, 192,0.5)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Navigation row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: 1,
          }}
        >
          <button
            onClick={() => setSelectedDate((d) => navigateDate(view, d, -1))}
            aria-label="Previous"
            style={{
              background: 'none',
              border: '1px solid rgba(216, 204, 192,0.15)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: 'var(--beige)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            ←
          </button>
          <button
            onClick={() => setSelectedDate((d) => navigateDate(view, d, 1))}
            aria-label="Next"
            style={{
              background: 'none',
              border: '1px solid rgba(216, 204, 192,0.15)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: 'var(--beige)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            →
          </button>
          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--beige-light)',
            }}
          >
            {formatPeriodLabel(view, selectedDate)}
          </span>
          <button
            onClick={() => setSelectedDate(new Date())}
            style={{
              background: 'none',
              border: '1px solid rgba(216, 204, 192,0.15)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: 'rgba(216, 204, 192,0.5)',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: '#dc3545', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <p style={{ color: 'rgba(216, 204, 192,0.5)' }}>Loading…</p>
      ) : (
        <div
          style={{
            background: 'rgba(42, 47, 53, 0.30)',
            borderRadius: '12px',
            border: '1px solid rgba(216, 204, 192,0.08)',
            padding: '1rem',
            overflow: 'hidden',
          }}
        >
          {view === 'month' && (
            <MonthView
              events={events}
              selectedDate={selectedDate}
              onSelectEvent={setSelectedEvent}
              onSelectDay={handleSelectDay}
            />
          )}
          {view === 'week' && (
            <WeekView
              events={events}
              selectedDate={selectedDate}
              onSelectEvent={setSelectedEvent}
              taskBlocks={taskBlocks}
            />
          )}
          {view === 'day' && (
            <DayView
              events={events}
              selectedDate={selectedDate}
              onSelectEvent={setSelectedEvent}
              taskBlocks={taskBlocks}
            />
          )}
        </div>
      )}

      {/* Event detail panel */}
      <EventDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

export type { CalendarEventData };
