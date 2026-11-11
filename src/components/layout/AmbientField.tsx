'use client';

import { useEffect } from 'react';

export type DayPart = 'dawn' | 'day' | 'dusk' | 'night';

export function dayPartForHour(hour: number): DayPart {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

/**
 * Keeps html[data-daypart] in sync with local time so the ambient
 * field tracks the sun. First paint is handled by the inline script
 * in the root layout; this owns every update after hydration.
 */
export function AmbientField() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.daypart = dayPartForHour(new Date().getHours());
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
