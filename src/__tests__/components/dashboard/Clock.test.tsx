import { render, screen } from '@testing-library/react';
import { Clock } from '@/components/dashboard/Clock';

describe('Clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a time string', () => {
    render(<Clock />);
    // Should render something with a colon separating hours and minutes
    const timeEl = screen.getByText(/\d+:\d{2}/);
    expect(timeEl).toBeInTheDocument();
  });

  it('renders a date string containing day-of-week (Friday)', () => {
    render(<Clock />);
    // 2026-04-17 is a Friday
    expect(screen.getByText(/friday/i)).toBeInTheDocument();
  });

  it('renders the month in the date string', () => {
    render(<Clock />);
    expect(screen.getByText(/april/i)).toBeInTheDocument();
  });
});
