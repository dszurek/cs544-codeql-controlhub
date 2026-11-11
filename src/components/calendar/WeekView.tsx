'use client';

import { useRouter } from 'next/navigation';
import type { CalendarEventData } from './EventDetail';
import { getEventColor } from './eventColor';
import type { TaskBlock } from './DayView';

interface WeekViewProps {
  events: CalendarEventData[];
  selectedDate: Date;
  onSelectEvent: (event: CalendarEventData) => void;
  taskBlocks?: TaskBlock[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = 40; // px per hour

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function WeekView({ events, selectedDate, onSelectEvent, taskBlocks = [] }: WeekViewProps) {
  const router = useRouter();
  const monday = getMondayOfWeek(selectedDate);
  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  function getTimedEventsForDay(day: Date) {
    return timedEvents.filter((e) => {
      const start = new Date(e.startAt);
      return isSameDay(start, day);
    });
  }

  function getAllDayEventsForDay(day: Date) {
    return allDayEvents.filter((e) => {
      const start = new Date(e.startAt);
      const end = new Date(e.endAt);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const cellDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      return cellDay >= startDay && cellDay <= endDay;
    });
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px repeat(7, 1fr)',
          borderBottom: '1px solid rgba(216, 204, 192,0.12)',
          marginBottom: 0,
        }}
      >
        <div />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              style={{
                textAlign: 'center',
                padding: '8px 4px',
                background: isToday ? 'rgba(176, 122, 79,0.07)' : 'transparent',
              }}
            >
              <div
                style={{
                  fontSize: '0.6875rem',
                  textTransform: 'uppercase',
                  color: 'var(--leather-light)',
                  letterSpacing: '0.05em',
                }}
              >
                {dayNames[i]}
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--leather-light)' : 'var(--beige)',
                }}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px repeat(7, 1fr)',
          borderBottom: '1px solid rgba(216, 204, 192,0.12)',
          minHeight: '28px',
        }}
      >
        <div
          style={{
            fontSize: '0.625rem',
            color: 'rgba(216, 204, 192,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '6px',
          }}
        >
          all-day
        </div>
        {weekDays.map((day, i) => {
          const dayAllDay = getAllDayEventsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              style={{
                padding: '2px',
                background: isToday ? 'rgba(176, 122, 79,0.07)' : 'transparent',
                borderLeft: '1px solid rgba(216, 204, 192,0.08)',
              }}
            >
              {dayAllDay.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  style={{
                    background: getEventColor(event),
                    color: 'white',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    marginBottom: '1px',
                  }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
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
            gridTemplateColumns: '48px repeat(7, 1fr)',
          }}
        >
          {/* Hour labels column */}
          <div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{
                  height: `${ROW_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingRight: '6px',
                  paddingTop: '2px',
                  fontSize: '0.625rem',
                  color: 'rgba(216, 204, 192,0.4)',
                  boxSizing: 'border-box',
                }}
              >
                {hour.toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const dayEvents = getTimedEventsForDay(day);
            const isToday = isSameDay(day, today);
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            const dayBlocks = taskBlocks.filter((b) => {
              const bStart = new Date(b.blockStart);
              const bEnd = new Date(b.blockEnd);
              return bStart < dayEnd && bEnd > dayStart;
            });
            return (
              <div
                key={di}
                style={{
                  position: 'relative',
                  background: isToday ? 'rgba(176, 122, 79,0.07)' : 'transparent',
                  borderLeft: '1px solid rgba(216, 204, 192,0.08)',
                }}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{
                      height: `${ROW_HEIGHT}px`,
                      borderBottom: '1px solid rgba(216, 204, 192,0.05)',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}

                {/* Task time blocks */}
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
                  const height = Math.max((durationMinutes / 60) * ROW_HEIGHT, 20);
                  const done = block.status === 'completed';
                  return (
                    <div
                      key={`block-${block.id}`}
                      onClick={() => router.push(`/tasks/${block.id}`)}
                      style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: '2px',
                        right: '2px',
                        height: `${height}px`,
                        background:
                          'repeating-linear-gradient(45deg, rgba(93,109,72,0.25) 0 6px, rgba(93,109,72,0.1) 6px 12px)',
                        border: '1px dashed rgba(93,109,72,0.55)',
                        color: 'var(--beige-light)',
                        fontSize: '0.6875rem',
                        borderRadius: '4px',
                        padding: '1px 4px',
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
                {dayEvents.map((event) => {
                  const start = new Date(event.startAt);
                  const end = new Date(event.endAt);
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  const durationMinutes = Math.max(
                    (end.getTime() - start.getTime()) / 60000,
                    15
                  );
                  const top = (startMinutes / 60) * ROW_HEIGHT;
                  const height = Math.max((durationMinutes / 60) * ROW_HEIGHT, 20);

                  return (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: '2px',
                        right: '2px',
                        height: `${height}px`,
                        background: getEventColor(event),
                        color: 'white',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        padding: '2px 4px',
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
