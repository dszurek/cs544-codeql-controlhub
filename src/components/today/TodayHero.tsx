'use client';

import { useEffect, useState } from 'react';

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Late shift';
}

export function TodayHero({ showClock = true }: { showClock?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, '0') : '––';
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '––';
  const ss = now ? String(now.getSeconds()).padStart(2, '0') : '––';

  return (
    <header className="today-hero reveal">
      <div>
        <h1 className="today-greet">{now ? greetingFor(now.getHours()) : ' '}</h1>
        <p className="today-date">
          {now
            ? now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
            : ' '}
        </p>
      </div>
      {showClock && (
        <div className="today-clock" aria-label="Current time">
          {hh}:{mm}
          <span className="clock-seconds">{ss}</span>
        </div>
      )}
    </header>
  );
}
