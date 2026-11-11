'use client';

import { useRouter } from 'next/navigation';
import type { CalendarEventData } from './EventDetail';
import { getEventColor } from './eventColor';

export interface TaskBlock {
  id: string;
  title: string;
  status: string;
  priority: number;
  blockStart: string;
  blockEnd: string;
}

interface DayViewProps {
  events: CalendarEventData[];
  selectedDate: Date;
  onSelectEvent: (event: CalendarEventData) => void;
  taskBlocks?: TaskBlock[];
}

const ROW_HEIGHT = 48; // px per hour

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function DayView({ events, selectedDate, onSelectEvent, taskBlocks = [] }: DayViewProps) {
  const router = useRouter();
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const dayBlocks = taskBlocks.filter((b) => {
    const bStart = new Date(b.blockStart);
    const bEnd = new Date(b.blockEnd);
    return bStart < dayEnd && bEnd > dayStart;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div style={{ width: '100%' }}>
      {/* All-day banner */}
      {allDayEvents.length > 0 && (
        <div
          style={{
            padding: '8px',
            borderBottom: '1px solid rgba(216, 204, 192,0.12)',
            marginBottom: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '0.6875rem',
              color: 'rgba(216, 204, 192,0.5)',
              marginRight: '4px',
            }}
          >
            All day
          </span>
          {allDayEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event)}
              style={{
                background: getEventColor(event),
                color: 'white',
                fontSize: '0.75rem',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              {event.title}
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div
        style={{
          overflowY: 'auto',
          maxHeight: '600px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr',
          }}
        >
          {/* Hour labels */}
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                style={{
                  height: `${ROW_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingRight: '8px',
                  paddingTop: '2px',
                  fontSize: '0.6875rem',
                  color: 'rgba(216, 204, 192,0.4)',
                  boxSizing: 'border-box',
                }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Event column */}
          <div style={{ position: 'relative', borderLeft: '1px solid rgba(216, 204, 192,0.12)' }}>
            {/* Hour grid lines */}
            {hours.map((hour) => (
              <div
                key={hour}
                style={{
                  height: `${ROW_HEIGHT}px`,
                  borderBottom: '1px solid rgba(216, 204, 192,0.06)',
                  boxSizing: 'border-box',
                }}
              />
            ))}

            {/* Task time blocks (rendered under events) */}
            {dayBlocks.map((block) => {
              const start = new Date(block.blockStart);
              const end = new Date(block.blockEnd);
              const clampedStart = start < dayStart ? dayStart : start;
              const clampedEnd = end > dayEnd ? dayEnd : end;
              const startMinutes =
                clampedStart.getHours() * 60 + clampedStart.getMinutes();
              const durationMinutes = Math.max(
                (clampedEnd.getTime() - clampedStart.getTime()) / 60000,
                15,
              );
              const top = (startMinutes / 60) * ROW_HEIGHT;
              const height = Math.max((durationMinutes / 60) * ROW_HEIGHT, 24);
              const done = block.status === 'completed';

              return (
                <div
                  key={`block-${block.id}`}
                  onClick={() => router.push(`/tasks/${block.id}`)}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: '4px',
                    right: '4px',
                    height: `${height}px`,
                    background:
                      'repeating-linear-gradient(45deg, rgba(93,109,72,0.25) 0 6px, rgba(93,109,72,0.1) 6px 12px)',
                    border: '1px dashed rgba(93,109,72,0.55)',
                    color: 'var(--beige-light)',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    zIndex: 0,
                    opacity: done ? 0.5 : 1,
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                  title={`Task block — ${block.title}`}
                >
                  ⧗ {block.title}
                </div>
              );
            })}

            {/* Timed events */}
            {timedEvents.map((event) => {
              const start = new Date(event.startAt);
              const end = new Date(event.endAt);
              const startMinutes = start.getHours() * 60 + start.getMinutes();
              const durationMinutes = Math.max(
                (end.getTime() - start.getTime()) / 60000,
                15
              );
              const top = (startMinutes / 60) * ROW_HEIGHT;
              const height = Math.max((durationMinutes / 60) * ROW_HEIGHT, 24);

              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: '4px',
                    right: '4px',
                    height: `${height}px`,
                    background: getEventColor(event),
                    color: 'white',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    zIndex: 1,
                  }}
                >
                  {event.title}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
