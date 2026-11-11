'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './navItems';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon />
            <span>{label}</span>
            {active && <div className="nav-dot" />}
          </Link>
        );
      })}
    </nav>
  );
}
