import { describe, it, expect } from 'vitest';
import { parseHaeDate, parseHaePayload } from '@/lib/health/hae';

describe('parseHaeDate', () => {
  it('parses the HAE timestamp format with timezone', () => {
    const d = parseHaeDate('2026-06-12 06:30:00 -0500');
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-06-12T11:30:00.000Z');
  });

  it('parses ISO strings as a fallback', () => {
    expect(parseHaeDate('2026-06-12T06:30:00Z')).not.toBeNull();
  });

  it('returns null for garbage', () => {
    expect(parseHaeDate('not a date')).toBeNull();
    expect(parseHaeDate(undefined)).toBeNull();
  });
});

describe('parseHaePayload', () => {
  it('parses qty metrics', () => {
    const { samples } = parseHaePayload({
      data: {
        metrics: [
          {
            name: 'step_count',
            units: 'count',
            data: [{ date: '2026-06-12 00:00:00 -0500', qty: 8421, source: 'iPhone' }],
          },
        ],
      },
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({ type: 'step_count', value: 8421, unit: 'count', source: 'iPhone' });
  });

  it('parses aggregate metrics (Min/Avg/Max) using the average', () => {
    const { samples } = parseHaePayload({
      data: {
        metrics: [
          {
            name: 'heart_rate',
            units: 'bpm',
            data: [{ date: '2026-06-12 09:00:00 -0500', Min: 48, Avg: 67, Max: 142 }],
          },
        ],
      },
    });
    expect(samples[0].value).toBe(67);
    expect(JSON.parse(samples[0].metadata!)).toEqual({ min: 48, max: 142 });
  });

  it('explodes sleep_analysis into per-stage samples spanning the session', () => {
    const { samples } = parseHaePayload({
      data: {
        metrics: [
          {
            name: 'sleep_analysis',
            units: 'hr',
            data: [
              {
                date: '2026-06-12 07:01:00 -0500',
                sleepStart: '2026-06-11 23:10:00 -0500',
                sleepEnd: '2026-06-12 07:01:00 -0500',
                asleep: 7.2,
                deep: 1.1,
                rem: 1.8,
                core: 4.3,
                awake: 0.4,
                inBed: 7.85,
              },
            ],
          },
        ],
      },
    });
    const types = samples.map((s) => s.type).sort();
    expect(types).toEqual(
      ['sleep_asleep', 'sleep_awake', 'sleep_core', 'sleep_deep', 'sleep_inbed', 'sleep_rem'].sort(),
    );
    const asleep = samples.find((s) => s.type === 'sleep_asleep')!;
    expect(asleep.value).toBe(7.2);
    expect(asleep.startDate.getTime()).toBeLessThan(asleep.endDate.getTime());
  });

  it('parses workouts with nested quantity objects', () => {
    const { workouts } = parseHaePayload({
      data: {
        workouts: [
          {
            name: 'Outdoor Run',
            start: '2026-06-12 06:30:00 -0500',
            end: '2026-06-12 07:10:00 -0500',
            duration: 40.1,
            activeEnergyBurned: { qty: 380, units: 'kcal' },
            distance: { qty: 6.4, units: 'km' },
            avgHeartRate: { qty: 152, units: 'bpm' },
          },
        ],
      },
    });
    expect(workouts).toHaveLength(1);
    expect(workouts[0]).toMatchObject({ type: 'Outdoor Run', duration: 40, energy: 380, distance: 6.4, avgHr: 152 });
  });

  it('derives duration from the start-end span, ignoring the ambiguous duration field', () => {
    // 06:30-07:10 is exactly 40 min; the duration field (2406, i.e. seconds)
    // must not turn a 40-minute run into 2406 minutes.
    const { workouts } = parseHaePayload({
      data: {
        workouts: [
          { name: 'Run', start: '2026-06-12 06:30:00 -0500', end: '2026-06-12 07:10:00 -0500', duration: 2406 },
        ],
      },
    });
    expect(workouts[0].duration).toBeCloseTo(40);
  });

  it('falls back to the duration field (seconds heuristic) when the span is unusable', () => {
    const { workouts } = parseHaePayload({
      data: {
        workouts: [
          { name: 'Run', start: '2026-06-12 06:30:00 -0500', end: '2026-06-12 06:30:00 -0500', duration: 2406 },
        ],
      },
    });
    expect(workouts[0].duration).toBeCloseTo(40.1);
  });

  it('tolerates junk without throwing', () => {
    expect(parseHaePayload(null)).toEqual({ samples: [], workouts: [] });
    expect(parseHaePayload({})).toEqual({ samples: [], workouts: [] });
    expect(parseHaePayload({ data: { metrics: [{ name: 'x', data: [{ date: 'bad' }] }] } }).samples).toHaveLength(0);
  });
});
