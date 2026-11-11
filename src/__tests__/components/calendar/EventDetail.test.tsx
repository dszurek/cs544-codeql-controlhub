import { render, screen, fireEvent } from '@testing-library/react';
import { EventDetail } from '@/components/calendar/EventDetail';

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

describe('EventDetail', () => {
  it('renders nothing when event is null', () => {
    const { container } = render(<EventDetail event={null} onClose={noop} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders event title when event is provided', () => {
    render(<EventDetail event={mockEvent} onClose={noop} />);
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn();
    render(<EventDetail event={mockEvent} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "All day" for allDay events', () => {
    const allDayEvent = { ...mockEvent, allDay: true };
    render(<EventDetail event={allDayEvent} onClose={noop} />);
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('shows location when present', () => {
    const eventWithLocation = { ...mockEvent, location: 'Conference Room A' };
    render(<EventDetail event={eventWithLocation} onClose={noop} />);
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
  });
});
