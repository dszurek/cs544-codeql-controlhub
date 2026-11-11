'use client';

import { useEffect, useState } from 'react';

export function Clock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const seconds = now.getSeconds();

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div
        style={{
          fontSize: 'clamp(3rem, 10vw, 6rem)',
          fontFamily: 'var(--font-playfair)',
          fontWeight: 400,
          lineHeight: 1,
          background:
            'linear-gradient(135deg, var(--beige-light) 0%, var(--leather-light) 55%, var(--forest-light) 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          letterSpacing: '-0.01em',
        }}
      >
        {time}
      </div>
      <div
        style={{
          fontSize: '0.8125rem',
          color: 'var(--leather-light)',
          marginTop: '0.5rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {date}
      </div>
      <div
        aria-hidden
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '3px',
          marginTop: '0.75rem',
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const active = i < Math.floor(seconds / 5);
          return (
            <div
              key={i}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: active ? 'var(--leather-light)' : 'rgba(216, 204, 192,0.15)',
                transition: 'background 260ms var(--ease-out)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
