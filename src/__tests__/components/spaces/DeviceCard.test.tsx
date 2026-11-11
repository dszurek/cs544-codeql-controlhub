import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceCard } from '@/components/spaces/DeviceCard';
import type { HaEntityState } from '@/hooks/useHaWebSocket';

function mockLight(state: 'on' | 'off', brightness = 128): HaEntityState {
  return {
    entity_id: 'light.kitchen',
    state,
    attributes: { friendly_name: 'Kitchen Light', brightness, supported_features: 1 },
    last_changed: '',
    last_updated: '',
  };
}

function mockSwitch(state: 'on' | 'off'): HaEntityState {
  return {
    entity_id: 'switch.bedroom',
    state,
    attributes: { friendly_name: 'Bedroom Switch' },
    last_changed: '',
    last_updated: '',
  };
}

function mockClimate(): HaEntityState {
  return {
    entity_id: 'climate.living_room',
    state: 'heat',
    attributes: {
      friendly_name: 'Living Room Thermostat',
      current_temperature: 21,
      temperature: 22,
    },
    last_changed: '',
    last_updated: '',
  };
}

function mockLock(state: 'locked' | 'unlocked'): HaEntityState {
  return {
    entity_id: 'lock.front_door',
    state,
    attributes: { friendly_name: 'Front Door Lock' },
    last_changed: '',
    last_updated: '',
  };
}

describe('LightCard', () => {
  it('shows friendly name and state', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockLight('on', 128)} onCallService={onCallService} />);
    expect(screen.getByText('Kitchen Light')).toBeInTheDocument();
    // 128/255 ≈ 50%
    expect(screen.getByText(/On • 50%/)).toBeInTheDocument();
  });

  it('toggle click calls onCallService with light.turn_off when on', async () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockLight('on')} onCallService={onCallService} />);
    fireEvent.click(screen.getByRole('button', { name: /turn off/i }));
    expect(onCallService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.kitchen' });
  });

  it('toggle click calls onCallService with light.turn_on when off', async () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockLight('off')} onCallService={onCallService} />);
    fireEvent.click(screen.getByRole('button', { name: /turn on/i }));
    expect(onCallService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.kitchen' });
  });

  it('brightness slider calls onCallService with brightness value', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockLight('on', 128)} onCallService={onCallService} />);
    const slider = screen.getByRole('slider', { name: /brightness/i });
    fireEvent.change(slider, { target: { value: '200' } });
    expect(onCallService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.kitchen',
      brightness: 200,
    });
  });
});

describe('SwitchCard', () => {
  it('toggle click calls onCallService with switch.turn_on when off', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockSwitch('off')} onCallService={onCallService} />);
    fireEvent.click(screen.getByRole('button', { name: /turn on/i }));
    expect(onCallService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.bedroom' });
  });
});

describe('ThermostatCard', () => {
  it('shows current and target temperature', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockClimate()} onCallService={onCallService} />);
    expect(screen.getByText('21°')).toBeInTheDocument();
    expect(screen.getByText('22°')).toBeInTheDocument();
  });

  it('+ button increases target and calls onCallService', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockClimate()} onCallService={onCallService} />);
    fireEvent.click(screen.getByRole('button', { name: /increase temperature/i }));
    expect(onCallService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.living_room',
      temperature: 23,
    });
  });

  it('- button decreases target and calls onCallService', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockClimate()} onCallService={onCallService} />);
    fireEvent.click(screen.getByRole('button', { name: /decrease temperature/i }));
    expect(onCallService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.living_room',
      temperature: 21,
    });
  });
});

describe('LockCard', () => {
  it('toggle calls onCallService with lock.unlock when locked', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockLock('locked')} onCallService={onCallService} />);
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    expect(onCallService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.front_door' });
  });

  it('toggle calls onCallService with lock.lock when unlocked', () => {
    const onCallService = vi.fn().mockResolvedValue(true);
    render(<DeviceCard entity={mockLock('unlocked')} onCallService={onCallService} />);
    fireEvent.click(screen.getByRole('button', { name: /^lock$/i }));
    expect(onCallService).toHaveBeenCalledWith('lock', 'lock', { entity_id: 'lock.front_door' });
  });
});
