import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/plan' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('Sidebar', () => {
  it('renders the ControlHub logo', () => {
    render(<Sidebar />);
    expect(screen.getByText('ControlHub')).toBeInTheDocument();
  });

  it('renders all 6 surfaces', () => {
    render(<Sidebar />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Streams')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Spaces')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('renders Settings link at the bottom', () => {
    render(<Sidebar />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('marks the current path as active', () => {
    render(<Sidebar />);
    const planLink = screen.getByText('Plan').closest('a');
    expect(planLink).toHaveClass('active');
  });

  it('does not mark other items as active', () => {
    render(<Sidebar />);
    const todayLink = screen.getByText('Today').closest('a');
    expect(todayLink).not.toHaveClass('active');
  });

  it('sets aria-current on the active item', () => {
    render(<Sidebar />);
    const planLink = screen.getByText('Plan').closest('a');
    expect(planLink).toHaveAttribute('aria-current', 'page');
  });
});
