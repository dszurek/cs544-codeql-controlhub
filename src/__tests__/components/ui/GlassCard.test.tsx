import { render, screen } from '@testing-library/react';
import { GlassCard } from '@/components/ui/GlassCard';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard><span>Hello world</span></GlassCard>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('applies the glass-card class', () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    expect(container.firstChild).toHaveClass('glass-card');
  });

  it('merges additional className', () => {
    const { container } = render(<GlassCard className="extra-class">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('glass-card');
    expect(container.firstChild).toHaveClass('extra-class');
  });
});
