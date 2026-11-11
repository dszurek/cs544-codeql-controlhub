import type { Trigger, Condition, Action } from '@/lib/routines/types';

export interface StarterRoutine {
  name: string;
  description: string;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  cooldownMinutes: number;
}

/** One-click cross-domain routines — the kind only a hub with all your
 *  data in one place can do. Users tweak after seeding. */
export const STARTER_ROUTINES: StarterRoutine[] = [
  {
    name: 'Wind-down on high sleep debt',
    description: 'At 21:30, if sleep debt is over 2 hours, nudge you to wind down and dim the lights.',
    trigger: { kind: 'time', at: '21:30' },
    conditions: [{ kind: 'health_metric', metric: 'sleepDebtMin', op: 'gt', value: 120 }],
    actions: [
      { kind: 'notify', title: 'Wind down', body: "You're carrying 2h+ of sleep debt. Start winding down.", glow: 'attend' },
      { kind: 'ha_service', domain: 'light', service: 'turn_off' },
    ],
    cooldownMinutes: 60,
  },
  {
    name: 'Leave-now nudge before meetings',
    description: 'Notifies you 15 minutes before any timed calendar event begins.',
    trigger: { kind: 'event_starting', minutesBefore: 15 },
    conditions: [],
    actions: [{ kind: 'notify', title: 'Upcoming event', body: 'Something starts in ~15 minutes.', glow: 'attend' }],
    cooldownMinutes: 0,
  },
  {
    name: 'Rest day on low readiness',
    description: 'At 08:00, if readiness is below 40, suggest taking it easy today.',
    trigger: { kind: 'time', at: '08:00' },
    conditions: [{ kind: 'health_metric', metric: 'readiness', op: 'lt', value: 40 }],
    actions: [
      { kind: 'notify', title: 'Low readiness', body: 'Readiness under 40 — consider a lighter day.', glow: 'urgent' },
    ],
    cooldownMinutes: 60,
  },
  {
    name: 'Morning auto-plan',
    description: 'At 07:15 on weekdays, replan the day around your calendar and energy.',
    trigger: { kind: 'time', at: '07:15', days: [1, 2, 3, 4, 5] },
    conditions: [],
    actions: [{ kind: 'replan_day' }],
    cooldownMinutes: 0,
  },
];
