import { classifyDomain, domainOf, titleize } from '@/lib/haDomains';

describe('domainOf', () => {
  it('takes the part before the dot', () => {
    expect(domainOf('light.kitchen_lamp')).toBe('light');
    expect(domainOf('media_player.echo_dot')).toBe('media_player');
  });
});

describe('classifyDomain', () => {
  it('marks interactive domains controllable', () => {
    for (const d of ['light', 'switch', 'climate', 'lock', 'fan', 'cover', 'media_player']) {
      expect(classifyDomain(d)).toBe('controllable');
    }
  });

  it('marks readings readonly', () => {
    expect(classifyDomain('sensor')).toBe('readonly');
    expect(classifyDomain('binary_sensor')).toBe('readonly');
  });

  it('hides plumbing domains and scenes (rendered separately)', () => {
    expect(classifyDomain('scene')).toBe('hidden');
    expect(classifyDomain('zone')).toBe('hidden');
    expect(classifyDomain('conversation')).toBe('hidden');
  });

  it('shows an unknown domain rather than dropping it', () => {
    expect(classifyDomain('some_future_domain')).toBe('readonly');
  });
});

describe('titleize', () => {
  it('humanizes snake_case', () => {
    expect(titleize('living_room')).toBe('Living Room');
    expect(titleize('office')).toBe('Office');
  });
});
