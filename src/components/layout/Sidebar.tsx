'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './navItems';
import { SettingsIcon } from './NavIcons';

function useClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      );
    tick();
    const id = setInterval(tick, 1000 * 15);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function Sidebar() {
  const pathname = usePathname();
  const time = useClock();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">ControlHub</div>
      <div className="sidebar-clock" aria-hidden>
        {time ?? ' '}
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <Link
          href="/settings"
          className={`sidebar-item${pathname === '/settings' ? ' active' : ''}`}
          aria-current={pathname === '/settings' ? 'page' : undefined}
        >
          <SettingsIcon />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
