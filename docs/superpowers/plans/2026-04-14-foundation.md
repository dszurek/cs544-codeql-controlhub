# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the ControlHub Next.js app with the earthy glassmorphism theme, responsive navigation shell (sidebar + bottom nav), Prisma/SQLite schema, and settings infrastructure — ready for feature plans to build on top.

**Architecture:** Next.js 15 App Router, TypeScript, Tailwind CSS for layout/spacing with custom CSS classes for glass effects. SQLite via Prisma for all persistence. Vitest + React Testing Library for unit tests. Development runs on macOS; production deployment to Raspberry Pi 5 is handled separately.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Prisma + SQLite, Vitest, @testing-library/react, node-schedule (installed now, used in later plans), chrono-node (installed now, used in Plan 2)

---

## File Map

```
controlhub/
├── prisma/
│   └── schema.prisma               # Full DB schema (all tables for all plans)
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout: fonts + AppShell
│   │   ├── globals.css             # CSS variables (earthy palette) + component classes
│   │   ├── page.tsx                # Home placeholder
│   │   ├── tasks/page.tsx          # Tasks placeholder
│   │   ├── calendar/page.tsx       # Calendar placeholder
│   │   ├── mail/page.tsx           # Mail placeholder
│   │   ├── spaces/page.tsx         # Spaces placeholder
│   │   ├── settings/
│   │   │   ├── page.tsx            # Settings server component (reads settings)
│   │   │   └── SettingsForm.tsx    # Settings client component (form)
│   │   └── api/
│   │       └── settings/
│   │           └── route.ts        # GET/POST settings API
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Wraps sidebar + main + bottom nav
│   │   │   ├── Sidebar.tsx         # Desktop left sidebar (lg+)
│   │   │   ├── BottomNav.tsx       # Mobile/touch bottom tab bar (< lg)
│   │   │   └── NavIcons.tsx        # SVG line icon components
│   │   └── ui/
│   │       └── GlassCard.tsx       # Reusable glass morphism card
│   ├── lib/
│   │   ├── db.ts                   # Prisma client singleton
│   │   └── settings.ts             # getSetting / setSetting / getSettings helpers
│   └── test/
│       └── setup.ts                # @testing-library/jest-dom setup
├── src/__tests__/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.test.tsx
│   │   │   └── Sidebar.test.tsx
│   │   └── ui/
│   │       └── GlassCard.test.tsx
│   ├── lib/
│   │   └── settings.test.ts
│   └── app/
│       └── api/
│           └── settings.test.ts
├── .env.local                      # DATABASE_URL (gitignored)
└── vitest.config.ts
```

---

## Task 1: Scaffold Next.js project + configure testing

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts` (via create-next-app)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Run create-next-app into the existing directory**

```bash
cd /Users/dszurek/Programming/controlhub
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

When prompted:
- Would you like to use Turbopack? → **Yes**
- Initialize a new git repository? → **No** (one already exists)

- [ ] **Step 2: Install additional dependencies**

```bash
npm install prisma @prisma/client node-schedule chrono-node
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @types/node-schedule
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Create src/test/setup.ts**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Add test scripts to package.json**

In `package.json`, add to the `"scripts"` block:
```json
"test": "vitest",
"test:run": "vitest run",
"test:ui": "vitest --ui"
```

- [ ] **Step 6: Verify test setup works**

```bash
npx vitest run
```

Expected: `No test files found` (not an error — just no tests yet).

- [ ] **Step 7: Add .env.local to .gitignore**

Append to `.gitignore`:
```
.env.local
*.db
*.db-journal
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with Vitest test setup"
```

---

## Task 2: Global theme (CSS variables + component classes)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css entirely**

```css
@import "tailwindcss";

/* ── Earthy palette (matches dszurekportfolio) ── */
:root {
  --dark:           #050505;
  --dark2:          #0a0a0a;
  --leather:        #8b5a3c;
  --leather-light:  #a67c52;
  --forest:         #2d4a3e;
  --forest-light:   #3d5a4e;
  --beige:          #d4c5b9;
  --beige-light:    #e8dfd5;
  --muted:          #b8b8b8;
  --font-inter:     'Inter', sans-serif;
  --font-playfair:  'Playfair Display', serif;
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-inter);
  background-color: var(--dark);
  color: var(--beige-light);
  -webkit-font-smoothing: antialiased;
  overflow: hidden; /* kiosk: no outer scroll */
}

/* ── App shell layout ── */
.app-shell {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: var(--dark);
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(45, 74, 62, 0.25) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(139, 90, 60, 0.15) 0%, transparent 50%);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  /* Space for fixed bottom nav on mobile */
  padding-bottom: 5rem;
}

@media (min-width: 1024px) {
  .main-content { padding-bottom: 1.5rem; }
}

/* ── Sidebar (desktop lg+) ── */
.sidebar {
  display: none;
  width: 220px;
  flex-shrink: 0;
  background: rgba(5, 5, 5, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(212, 197, 185, 0.08);
  flex-direction: column;
  padding: 1.5rem 0;
}

@media (min-width: 1024px) {
  .sidebar { display: flex; }
}

.sidebar-logo {
  font-family: var(--font-playfair);
  font-size: 1.25rem;
  padding: 0 1.25rem 1.5rem;
  background: linear-gradient(135deg, var(--beige-light), var(--leather-light), var(--forest-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-nav { flex: 1; }

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.8125rem;
  color: rgba(212, 197, 185, 0.4);
  text-decoration: none;
  letter-spacing: 0.03em;
  transition: color 0.15s, background 0.15s;
  border-right: 2px solid transparent;
}

.sidebar-item:hover { color: rgba(212, 197, 185, 0.7); }

.sidebar-item.active {
  color: var(--leather-light);
  background: rgba(139, 90, 60, 0.08);
  border-right-color: var(--leather-light);
}

.sidebar-bottom {
  margin-top: auto;
  border-top: 1px solid rgba(212, 197, 185, 0.08);
  padding-top: 0.75rem;
}

/* ── Bottom nav (mobile/touch < lg) ── */
.bottom-nav {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(5, 5, 5, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(212, 197, 185, 0.08);
  z-index: 50;
}

@media (min-width: 1024px) {
  .bottom-nav { display: none; }
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0.625rem 0 0.375rem;
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(212, 197, 185, 0.35);
  text-decoration: none;
  transition: color 0.15s;
}

.nav-item.active { color: var(--leather-light); }

.nav-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--leather-light);
}

/* ── Glass card ── */
.glass-card {
  background: rgba(13, 13, 13, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 197, 185, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  border-radius: 10px;
  padding: 0.875rem 1rem;
}

/* ── Section label ── */
.section-label {
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--leather-light);
  margin-bottom: 0.5rem;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--leather); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--leather-light); }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add earthy glassmorphism theme and component CSS classes"
```

---

## Task 3: GlassCard component (TDD)

**Files:**
- Create: `src/__tests__/components/ui/GlassCard.test.tsx`
- Create: `src/components/ui/GlassCard.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/ui/GlassCard.test.tsx
import { render, screen } from '@testing-library/react';
import { GlassCard } from '@/components/ui/GlassCard';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard><span>Hello world</span></GlassCard>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('applies the glass-card class', () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    expect(container.firstChild).toHaveClass('glass-card');
  });

  it('merges additional className', () => {
    const { container } = render(<GlassCard className="extra-class">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('glass-card');
    expect(container.firstChild).toHaveClass('extra-class');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/components/ui/GlassCard.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/GlassCard'`

- [ ] **Step 3: Implement GlassCard**

```tsx
// src/components/ui/GlassCard.tsx
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={`glass-card${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/components/ui/GlassCard.test.tsx
```

Expected: PASS — 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GlassCard.tsx src/__tests__/components/ui/GlassCard.test.tsx
git commit -m "feat: add GlassCard component with tests"
```

---

## Task 4: NavIcons (SVG line icons)

**Files:**
- Create: `src/components/layout/NavIcons.tsx`

- [ ] **Step 1: Create NavIcons.tsx**

```tsx
// src/components/layout/NavIcons.tsx
const iconProps = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

export function TasksIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

export function SpacesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 2a7 7 0 017 7c0 4-3.5 8-7 11-3.5-3-7-7-7-11a7 7 0 017-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/NavIcons.tsx
git commit -m "feat: add SVG line icon components for navigation"
```

---

## Task 5: BottomNav component (TDD)

**Files:**
- Create: `src/__tests__/components/layout/BottomNav.test.tsx`
- Create: `src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/layout/BottomNav.test.tsx
import { render, screen } from '@testing-library/react';
import { BottomNav } from '@/components/layout/BottomNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  it('renders all 5 navigation labels', () => {
    render(<BottomNav />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Mail')).toBeInTheDocument();
    expect(screen.getByText('Spaces')).toBeInTheDocument();
  });

  it('marks the current path as active', () => {
    render(<BottomNav />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveClass('active');
  });

  it('does not mark other items as active', () => {
    render(<BottomNav />);
    const tasksLink = screen.getByText('Tasks').closest('a');
    expect(tasksLink).not.toHaveClass('active');
  });

  it('renders an active indicator dot only for the active item', () => {
    const { container } = render(<BottomNav />);
    const dots = container.querySelectorAll('.nav-dot');
    expect(dots).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/components/layout/BottomNav.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/layout/BottomNav'`

- [ ] **Step 3: Implement BottomNav**

```tsx
// src/components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, TasksIcon, CalendarIcon, MailIcon, SpacesIcon,
} from './NavIcons';

const NAV_ITEMS = [
  { href: '/',          label: 'Home',     Icon: HomeIcon },
  { href: '/tasks',     label: 'Tasks',    Icon: TasksIcon },
  { href: '/calendar',  label: 'Calendar', Icon: CalendarIcon },
  { href: '/mail',      label: 'Mail',     Icon: MailIcon },
  { href: '/spaces',    label: 'Spaces',   Icon: SpacesIcon },
] as const;

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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/components/layout/BottomNav.test.tsx
```

Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/__tests__/components/layout/BottomNav.test.tsx
git commit -m "feat: add BottomNav component with tests"
```

---

## Task 6: Sidebar component (TDD)

**Files:**
- Create: `src/__tests__/components/layout/Sidebar.test.tsx`
- Create: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/layout/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/tasks' }));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('Sidebar', () => {
  it('renders the ControlHub logo', () => {
    render(<Sidebar />);
    expect(screen.getByText('ControlHub')).toBeInTheDocument();
  });

  it('renders all 5 main nav items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Mail')).toBeInTheDocument();
    expect(screen.getByText('Spaces')).toBeInTheDocument();
  });

  it('renders Settings link at the bottom', () => {
    render(<Sidebar />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('marks the current path as active', () => {
    render(<Sidebar />);
    const tasksLink = screen.getByText('Tasks').closest('a');
    expect(tasksLink).toHaveClass('active');
  });

  it('does not mark other items as active', () => {
    render(<Sidebar />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).not.toHaveClass('active');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/components/layout/Sidebar.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/layout/Sidebar'`

- [ ] **Step 3: Implement Sidebar**

```tsx
// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, TasksIcon, CalendarIcon, MailIcon, SpacesIcon, SettingsIcon,
} from './NavIcons';

const NAV_ITEMS = [
  { href: '/',         label: 'Home',     Icon: HomeIcon },
  { href: '/tasks',    label: 'Tasks',    Icon: TasksIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/mail',     label: 'Mail',     Icon: MailIcon },
  { href: '/spaces',   label: 'Spaces',   Icon: SpacesIcon },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">ControlHub</div>

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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/components/layout/Sidebar.test.tsx
```

Expected: PASS — 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/__tests__/components/layout/Sidebar.test.tsx
git commit -m "feat: add Sidebar component with tests"
```

---

## Task 7: AppShell + root layout

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create AppShell**

```tsx
// src/components/layout/AppShell.tsx
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Update root layout with fonts and AppShell**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: '700',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ControlHub',
  description: 'Personal productivity hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Start the dev server and verify the shell renders**

```bash
npm run dev
```

Open http://localhost:3000. Expected: dark background with earthy gradient, sidebar visible on a wide window, bottom nav visible on a narrow window. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx src/app/layout.tsx
git commit -m "feat: add AppShell and root layout with Inter + Playfair Display fonts"
```

---

## Task 8: Prisma schema + database setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env.local`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and `.env`. Rename `.env` to `.env.local`:

```bash
mv .env .env.local
```

- [ ] **Step 2: Set DATABASE_URL in .env.local**

```bash
# .env.local
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 3: Replace prisma/schema.prisma with the full schema**

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Task {
  id          String    @id @default(cuid())
  title       String
  notes       String?
  type        String    @default("general") // assignment | meeting | shopping | general
  priority    Int       @default(4)          // 1 (highest) – 4 (lowest)
  status      String    @default("pending")  // pending | completed | cancelled
  dueDate     DateTime?
  dueTime     String?                        // "HH:MM" string for time component
  recurrence  String?                        // rrule string or null
  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id])
  parentId    String?
  parent      Task?     @relation("Subtasks", fields: [parentId], references: [id])
  subtasks    Task[]    @relation("Subtasks")
  source      String    @default("manual")   // manual | blackboard_sync
  externalId  String?   @unique
  createdAt   DateTime  @default(now())
  completedAt DateTime?
}

model Project {
  id        String  @id @default(cuid())
  name      String
  color     String  @default("#8b5a3c")
  icon      String?
  sortOrder Int     @default(0)
  tasks     Task[]
}

model CalendarEvent {
  id           String   @id @default(cuid())
  title        String
  startAt      DateTime
  endAt        DateTime
  allDay       Boolean  @default(false)
  location     String?
  source       String   // outlook | icloud
  sourceId     String
  calendarName String
  color        String?
  rawData      String?
  updatedAt    DateTime @updatedAt

  @@unique([source, sourceId])
}

model Email {
  id          String   @id @default(cuid())
  subject     String
  senderName  String
  senderEmail String
  preview     String?
  isRead      Boolean  @default(false)
  receivedAt  DateTime
  source      String   // outlook | gmail
  sourceId    String
  updatedAt   DateTime @updatedAt

  @@unique([source, sourceId])
}

model HomeAssistantScene {
  id         String @id @default(cuid())
  haEntityId String @unique
  name       String
  icon       String?
  sortOrder  Int    @default(0)
}

model Settings {
  key   String @id
  value String
}

model SyncLog {
  id       String   @id @default(cuid())
  source   String   // outlook | gmail | icloud | homeassistant
  syncedAt DateTime @default(now())
  status   String   // success | error
  error    String?
}
```

- [ ] **Step 4: Run the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected output ends with: `Your database is now in sync with your schema.`

- [ ] **Step 5: Add prisma generate to postinstall in package.json**

In `package.json`, add to `"scripts"`:
```json
"postinstall": "prisma generate"
```

- [ ] **Step 6: Commit**

```bash
git add prisma/ package.json
git commit -m "feat: add Prisma schema with SQLite and initial migration"
```

---

## Task 9: db.ts + settings.ts (TDD)

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/settings.ts`
- Create: `src/__tests__/lib/settings.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/settings.test.ts
import { getSetting, setSetting, getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    settings: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSetting', () => {
  it('returns the value when the setting exists', async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({ key: 'ha_url', value: 'http://homeassistant.local:8123' });
    const result = await getSetting('ha_url');
    expect(result).toBe('http://homeassistant.local:8123');
    expect(prisma.settings.findUnique).toHaveBeenCalledWith({ where: { key: 'ha_url' } });
  });

  it('returns null when the setting does not exist', async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
    const result = await getSetting('nonexistent');
    expect(result).toBeNull();
  });
});

describe('setSetting', () => {
  it('upserts the setting with correct arguments', async () => {
    vi.mocked(prisma.settings.upsert).mockResolvedValue({ key: 'ha_token', value: 'abc123' });
    await setSetting('ha_token', 'abc123');
    expect(prisma.settings.upsert).toHaveBeenCalledWith({
      where: { key: 'ha_token' },
      update: { value: 'abc123' },
      create: { key: 'ha_token', value: 'abc123' },
    });
  });
});

describe('getSettings', () => {
  it('returns a map with values for found keys and null for missing keys', async () => {
    vi.mocked(prisma.settings.findMany).mockResolvedValue([
      { key: 'ha_url', value: 'http://homeassistant.local:8123' },
      { key: 'ha_token', value: 'abc123' },
    ]);
    const result = await getSettings(['ha_url', 'ha_token', 'icloud_email']);
    expect(result).toEqual({
      ha_url: 'http://homeassistant.local:8123',
      ha_token: 'abc123',
      icloud_email: null,
    });
    expect(prisma.settings.findMany).toHaveBeenCalledWith({
      where: { key: { in: ['ha_url', 'ha_token', 'icloud_email'] } },
    });
  });

  it('returns all nulls when no settings exist', async () => {
    vi.mocked(prisma.settings.findMany).mockResolvedValue([]);
    const result = await getSettings(['a', 'b']);
    expect(result).toEqual({ a: null, b: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/lib/settings.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db'`

- [ ] **Step 3: Create db.ts**

```ts
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Create settings.ts**

```ts
// src/lib/settings.ts
import { prisma } from './db';

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const rows = await prisma.settings.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string | null> = Object.fromEntries(keys.map((k) => [k, null]));
  for (const row of rows) map[row.key] = row.value;
  return map;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/__tests__/lib/settings.test.ts
```

Expected: PASS — 5 tests passed

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/settings.ts src/__tests__/lib/settings.test.ts
git commit -m "feat: add Prisma db singleton and settings helpers with tests"
```

---

## Task 10: Settings API route (TDD)

**Files:**
- Create: `src/__tests__/app/api/settings.test.ts`
- Create: `src/app/api/settings/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/app/api/settings.test.ts
import { GET, POST } from '@/app/api/settings/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/settings', () => ({
  getSetting: vi.fn().mockResolvedValue('test-value'),
  setSetting: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue({ ha_url: 'http://ha.local', ha_token: null }),
}));

describe('GET /api/settings', () => {
  it('returns a single setting when key param is provided', async () => {
    const req = new NextRequest('http://localhost/api/settings?key=ha_url');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ key: 'ha_url', value: 'test-value' });
  });

  it('returns multiple settings when keys param is provided', async () => {
    const req = new NextRequest('http://localhost/api/settings?keys=ha_url,ha_token');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ha_url: 'http://ha.local', ha_token: null });
  });

  it('returns 400 when neither key nor keys param is provided', async () => {
    const req = new NextRequest('http://localhost/api/settings');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/settings', () => {
  it('saves a setting and returns ok', async () => {
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'ha_url', value: 'http://ha.local' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('returns 400 when key is missing', async () => {
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ value: 'something' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/app/api/settings.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/settings/route'`

- [ ] **Step 3: Create the settings API route**

```ts
// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting, getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const keys = request.nextUrl.searchParams.get('keys');
  const key = request.nextUrl.searchParams.get('key');

  if (keys) {
    const result = await getSettings(keys.split(','));
    return NextResponse.json(result);
  }

  if (key) {
    const value = await getSetting(key);
    return NextResponse.json({ key, value });
  }

  return NextResponse.json({ error: 'Provide ?key=<k> or ?keys=<k1,k2>' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, value } = body as { key?: string; value?: string };

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  await setSetting(key, value);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/app/api/settings.test.ts
```

Expected: PASS — 5 tests passed

- [ ] **Step 5: Run all tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/settings/ src/__tests__/app/api/settings.test.ts
git commit -m "feat: add settings API route (GET/POST) with tests"
```

---

## Task 11: Placeholder pages

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/tasks/page.tsx`
- Create: `src/app/calendar/page.tsx`
- Create: `src/app/mail/page.tsx`
- Create: `src/app/spaces/page.tsx`

- [ ] **Step 1: Create all placeholder pages**

```tsx
// src/app/page.tsx
import { GlassCard } from '@/components/ui/GlassCard';

export default function HomePage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-playfair)', marginBottom: '1rem', color: 'var(--beige-light)' }}>
        Home
      </h1>
      <GlassCard>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Dashboard coming in Plan 5.
        </p>
      </GlassCard>
    </div>
  );
}
```

```tsx
// src/app/tasks/page.tsx
import { GlassCard } from '@/components/ui/GlassCard';

export default function TasksPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-playfair)', marginBottom: '1rem', color: 'var(--beige-light)' }}>
        Tasks
      </h1>
      <GlassCard>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Task management coming in Plan 2.
        </p>
      </GlassCard>
    </div>
  );
}
```

```tsx
// src/app/calendar/page.tsx
import { GlassCard } from '@/components/ui/GlassCard';

export default function CalendarPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-playfair)', marginBottom: '1rem', color: 'var(--beige-light)' }}>
        Calendar
      </h1>
      <GlassCard>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Calendar integration coming in Plan 3.
        </p>
      </GlassCard>
    </div>
  );
}
```

```tsx
// src/app/mail/page.tsx
import { GlassCard } from '@/components/ui/GlassCard';

export default function MailPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-playfair)', marginBottom: '1rem', color: 'var(--beige-light)' }}>
        Mail
      </h1>
      <GlassCard>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Email integration coming in Plan 3.
        </p>
      </GlassCard>
    </div>
  );
}
```

```tsx
// src/app/spaces/page.tsx
import { GlassCard } from '@/components/ui/GlassCard';

export default function SpacesPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-playfair)', marginBottom: '1rem', color: 'var(--beige-light)' }}>
        Spaces
      </h1>
      <GlassCard>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Smart home control coming in Plan 4.
        </p>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Verify navigation works in the browser**

With `npm run dev` running, click each nav item (sidebar on desktop, bottom tab on narrow window) and confirm each page loads with its placeholder card. Confirm active states update on both nav components.

- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "feat: add placeholder pages for all 5 sections"
```

---

## Task 12: Settings page UI

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/app/settings/SettingsForm.tsx`

- [ ] **Step 1: Create the SettingsForm client component**

```tsx
// src/app/settings/SettingsForm.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface SettingsFormProps {
  initialValues: Record<string, string | null>;
}

function SettingField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={name}
        style={{
          display: 'block',
          fontSize: '0.6875rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--leather-light)',
          marginBottom: '0.375rem',
        }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'rgba(13, 13, 13, 0.6)',
          border: '1px solid rgba(212, 197, 185, 0.15)',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          color: 'var(--beige-light)',
          fontSize: '0.875rem',
          outline: 'none',
        }}
      />
    </div>
  );
}

export function SettingsForm({ initialValues }: SettingsFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialValues).map(([k, v]) => [k, v ?? ''])
    )
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  async function handleSave(keys: string[]) {
    setSaving(true);
    await Promise.all(
      keys.map((key) =>
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: values[key] ?? '' }),
        })
      )
    );
    setSaving(false);
    setSaved(true);
  }

  const sectionStyle = { marginBottom: '1.5rem' };
  const headingStyle = {
    fontFamily: 'var(--font-playfair)',
    fontSize: '1rem',
    color: 'var(--beige-light)',
    marginBottom: '0.75rem',
  };

  const HA_KEYS = ['ha_url', 'ha_token'];
  const ICLOUD_KEYS = ['icloud_email', 'icloud_app_password'];
  const SYNC_KEYS = ['sync_interval_email', 'sync_interval_calendar', 'sync_interval_tasks'];

  return (
    <div>
      {/* Home Assistant */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Home Assistant</h2>
          <SettingField label="Home Assistant URL" name="ha_url" value={values.ha_url ?? ''} onChange={handleChange} placeholder="http://homeassistant.local:8123" />
          <SettingField label="Long-lived access token" name="ha_token" value={values.ha_token ?? ''} onChange={handleChange} type="password" placeholder="eyJ..." />
          <button onClick={() => handleSave(HA_KEYS)} disabled={saving} style={buttonStyle}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </GlassCard>
      </div>

      {/* iCloud */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>iCloud Calendar</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Use an app-specific password generated at appleid.apple.com — not your Apple ID password.
          </p>
          <SettingField label="Apple ID (email)" name="icloud_email" value={values.icloud_email ?? ''} onChange={handleChange} placeholder="you@icloud.com" />
          <SettingField label="App-specific password" name="icloud_app_password" value={values.icloud_app_password ?? ''} onChange={handleChange} type="password" placeholder="xxxx-xxxx-xxxx-xxxx" />
          <button onClick={() => handleSave(ICLOUD_KEYS)} disabled={saving} style={buttonStyle}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </GlassCard>
      </div>

      {/* Outlook */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Outlook / Microsoft 365</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            OAuth 2.0 setup — configured in Plan 3. Register an app at portal.azure.com and enter credentials below.
          </p>
          <SettingField label="Client ID" name="outlook_client_id" value={values.outlook_client_id ?? ''} onChange={handleChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          <SettingField label="Client Secret" name="outlook_client_secret" value={values.outlook_client_secret ?? ''} onChange={handleChange} type="password" />
          <button onClick={() => handleSave(['outlook_client_id', 'outlook_client_secret'])} disabled={saving} style={buttonStyle}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </GlassCard>
      </div>

      {/* Gmail */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Gmail</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            OAuth 2.0 setup — configured in Plan 3. Create credentials at console.cloud.google.com.
          </p>
          <SettingField label="Client ID" name="gmail_client_id" value={values.gmail_client_id ?? ''} onChange={handleChange} placeholder="xxxxxx.apps.googleusercontent.com" />
          <SettingField label="Client Secret" name="gmail_client_secret" value={values.gmail_client_secret ?? ''} onChange={handleChange} type="password" />
          <button onClick={() => handleSave(['gmail_client_id', 'gmail_client_secret'])} disabled={saving} style={buttonStyle}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </GlassCard>
      </div>

      {/* Sync intervals */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Sync Intervals (minutes)</h2>
          <SettingField label="Email sync interval" name="sync_interval_email" value={values.sync_interval_email ?? '10'} onChange={handleChange} placeholder="10" />
          <SettingField label="Calendar sync interval" name="sync_interval_calendar" value={values.sync_interval_calendar ?? '10'} onChange={handleChange} placeholder="10" />
          <SettingField label="Task import interval" name="sync_interval_tasks" value={values.sync_interval_tasks ?? '30'} onChange={handleChange} placeholder="30" />
          <button onClick={() => handleSave(SYNC_KEYS)} disabled={saving} style={buttonStyle}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </GlassCard>
      </div>

      {saved && (
        <p style={{ fontSize: '0.75rem', color: 'var(--forest-light)', textAlign: 'right' }}>
          Saved successfully
        </p>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: 'rgba(139, 90, 60, 0.25)',
  border: '1px solid rgba(139, 90, 60, 0.4)',
  borderRadius: '6px',
  color: 'var(--leather-light)',
  fontSize: '0.8125rem',
  padding: '0.4375rem 1rem',
  cursor: 'pointer',
  letterSpacing: '0.03em',
};
```

- [ ] **Step 2: Create the Settings server page**

```tsx
// src/app/settings/page.tsx
import { getSettings } from '@/lib/settings';
import { SettingsForm } from './SettingsForm';

const SETTING_KEYS = [
  'ha_url',
  'ha_token',
  'icloud_email',
  'icloud_app_password',
  'outlook_client_id',
  'outlook_client_secret',
  'gmail_client_id',
  'gmail_client_secret',
  'sync_interval_email',
  'sync_interval_calendar',
  'sync_interval_tasks',
];

export default async function SettingsPage() {
  const settings = await getSettings(SETTING_KEYS);

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontFamily: 'var(--font-playfair)', marginBottom: '1.5rem', color: 'var(--beige-light)' }}>
        Settings
      </h1>
      <SettingsForm initialValues={settings} />
    </div>
  );
}
```

- [ ] **Step 3: Verify Settings page in the browser**

With `npm run dev` running, navigate to Settings via the sidebar/bottom nav. Confirm:
- All 5 sections render (Home Assistant, iCloud, Outlook, Gmail, Sync Intervals)
- Inputs accept text input
- Save button POSTs to `/api/settings` (check Network tab)
- "Saved successfully" appears after saving

- [ ] **Step 4: Run all tests one final time**

```bash
npx vitest run
```

Expected: All 17 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/
git commit -m "feat: add Settings page with integration credential forms"
```

---

## Plan Complete

**What's working after this plan:**
- Full Next.js 15 app running on `npm run dev`
- Earthy glassmorphism theme with earthy palette
- Responsive navigation: sidebar on desktop (lg+), bottom tab bar on mobile/touch
- All 5 section pages with placeholders
- Settings page that reads/writes credentials to SQLite
- Full Prisma schema ready for Plans 2–5
- 17 unit tests passing

**Next plans:**
- **Plan 2:** Task management (Todoist-quality CRUD, filtering, sorting, subtasks)
- **Plan 3:** Calendar + Email integrations (Outlook, Gmail, iCloud CalDAV)
- **Plan 4:** Smart Home / Spaces (Home Assistant REST + WebSocket)
- **Plan 5:** Dashboard home page (weather, today view, unified widgets)
