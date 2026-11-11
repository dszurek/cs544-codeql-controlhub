import { render, screen, fireEvent } from '@testing-library/react';
import { MonthView } from '@/components/calendar/MonthView';

const mockEvent = {
  id: 'e1',
  title: 'Team Meeting',
  startAt: '2026-04-15T10:00:00Z',
  endAt: '2026-04-15T11:00:00Z',
  allDay: false,
  location: null,
  source: 'outlook',
  calendarName: 'Work',
  color: null,
};

const noop = () => {};

describe('MonthView', () => {
  it('renders 7 day-of-week headers (Sun through Sat)', () => {
    render(
      <MonthView
        events={[]}
        selectedDate={new Date('2026-04-15')}
        onSelectEvent={noop}
        onSelectDay={noop}
      />
    );
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders all days of April 2026', () => {
    render(
      <MonthView
        events={[]}
        selectedDate={new Date('2026-04-15')}
        onSelectEvent={noop}
        onSelectDay={noop}
      />
    );
    // April has 30 days; check a few
    // Day numbers appear as text in the grid cells.
    // Multiple cells may show the same number (e.g. 1 also appears as the last day of March in prev month)
    // We just verify all 30 days of April are findable — use getAllByText for ambiguous ones
    for (let d = 1; d <= 30; d++) {
      const matches = screen.getAllByText(String(d));
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('calls onSelectDay when a day cell is clicked', () => {
    const onSelectDay = vi.fn();
    render(
      <MonthView
        events={[]}
        selectedDate={new Date('2026-04-15')}
        onSelectEvent={noop}
        onSelectDay={onSelectDay}
      />
    );
    // Click on "15" — there should be exactly one "15" visible in April
    const dayCell = screen.getAllByText('15')[0];
    // Click the parent cell div
    fireEvent.click(dayCell.closest('div[style]')!);
    expect(onSelectDay).toHaveBeenCalledTimes(1);
    const calledWith: Date = onSelectDay.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Date);
  });

  it('shows event chip for events in the current month', () => {
    render(
      <MonthView
        events={[mockEvent]}
        selectedDate={new Date('2026-04-15')}
        onSelectEvent={noop}
        onSelectDay={noop}
      />
    );
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('calls onSelectEvent when an event chip is clicked', () => {
    const onSelectEvent = vi.fn();
    render(
      <MonthView
        events={[mockEvent]}
        selectedDate={new Date('2026-04-15')}
        onSelectEvent={onSelectEvent}
        onSelectDay={noop}
      />
    );
    const chip = screen.getByText('Team Meeting');
    fireEvent.click(chip);
    expect(onSelectEvent).toHaveBeenCalledWith(mockEvent);
  });
});
