'use client';

import type { CalendarEventData } from './EventDetail';
import { getEventColor } from './eventColor';

interface MonthViewProps {
  events: CalendarEventData[];
  selectedDate: Date;
  onSelectEvent: (event: CalendarEventData) => void;
  onSelectDay: (date: Date) => void;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ events, selectedDate, onSelectEvent, onSelectDay }: MonthViewProps) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // First day of month and how many cells to prepend
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = firstDayOfMonth.getDay(); // 0=Sun

  // 42 cells total (6 weeks)
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    cells.push(d);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function getEventsForDay(day: Date): CalendarEventData[] {
    return events.filter((e) => {
      const start = new Date(e.startAt);
      const end = new Date(e.endAt);
      // Include all-day events and events that overlap this day
      if (e.allDay) {
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const cellDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        return cellDay >= startDay && cellDay <= endDay;
      }
      return isSameDay(start, day);
    });
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Day headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: '2px',
        }}
      >
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              color: 'var(--leather-light)',
              padding: '4px 0',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          border: '1px solid rgba(216, 204, 192,0.08)',
        }}
      >
        {cells.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const dayEvents = getEventsForDay(day);
          const visibleEvents = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - 3;

          return (
            <div
              key={idx}
              onClick={() => onSelectDay(day)}
              style={{
                minHeight: '80px',
                padding: '4px',
                border: '1px solid rgba(216, 204, 192,0.08)',
                verticalAlign: 'top',
                opacity: isCurrentMonth ? 1 : 0.35,
                cursor: 'pointer',
                background: 'transparent',
                boxSizing: 'border-box',
              }}
            >
              {/* Day number */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: isToday ? 'var(--leather-light)' : 'transparent',
                  color: isToday ? '#fff' : 'var(--beige)',
                  fontSize: '0.75rem',
                  fontWeight: isToday ? 700 : 400,
                  marginBottom: '2px',
                }}
              >
                {day.getDate()}
              </div>

              {/* Event chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      marginBottom: '1px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      color: 'white',
                      background: getEventColor(event),
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <div
                    style={{
                      fontSize: '0.625rem',
                      color: 'rgba(216, 204, 192,0.5)',
                      cursor: 'pointer',
                    }}
                  >
                    +{overflow} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
