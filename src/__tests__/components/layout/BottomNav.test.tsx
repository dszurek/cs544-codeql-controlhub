import { render, screen } from '@testing-library/react';
import { BottomNav } from '@/components/layout/BottomNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  it('renders all 6 surface labels', () => {
    render(<BottomNav />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Streams')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Spaces')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('marks the current path as active', () => {
    render(<BottomNav />);
    const todayLink = screen.getByText('Today').closest('a');
    expect(todayLink).toHaveClass('active');
  });

  it('does not mark other items as active', () => {
    render(<BottomNav />);
    const planLink = screen.getByText('Plan').closest('a');
    expect(planLink).not.toHaveClass('active');
  });

  it('renders an active indicator dot only for the active item', () => {
    const { container } = render(<BottomNav />);
    const dots = container.querySelectorAll('.nav-dot');
    expect(dots).toHaveLength(1);
  });

  it('sets aria-current on the active item', () => {
    render(<BottomNav />);
    const todayLink = screen.getByText('Today').closest('a');
    expect(todayLink).toHaveAttribute('aria-current', 'page');
  });
});
