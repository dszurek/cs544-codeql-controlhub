import { render, screen, fireEvent } from '@testing-library/react';
import { SceneList } from '@/components/spaces/SceneList';

const scenes = [
  { id: '1', haEntityId: 'scene.morning', name: 'Morning', icon: '☀️' },
  { id: '2', haEntityId: 'scene.evening', name: 'Evening', icon: '🌙' },
];

describe('SceneList', () => {
  it('renders scene names', () => {
    const onActivate = vi.fn().mockResolvedValue(true);
    render(<SceneList scenes={scenes} onActivate={onActivate} />);
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
  });

  it('clicking a scene calls onActivate with the correct haEntityId', () => {
    const onActivate = vi.fn().mockResolvedValue(true);
    render(<SceneList scenes={scenes} onActivate={onActivate} />);
    fireEvent.click(screen.getByText('Morning'));
    expect(onActivate).toHaveBeenCalledWith('scene.morning');
  });

  it('empty array renders nothing visible (no buttons)', () => {
    const onActivate = vi.fn().mockResolvedValue(true);
    const { container } = render(<SceneList scenes={[]} onActivate={onActivate} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
