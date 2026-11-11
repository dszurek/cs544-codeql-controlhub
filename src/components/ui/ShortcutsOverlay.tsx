'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['⌘', 'K'], label: 'Quick-add task (also Ctrl+K)' },
  { keys: ['g', 'h'], label: 'Go to Home' },
  { keys: ['g', 't'], label: 'Go to Tasks' },
  { keys: ['g', 'c'], label: 'Go to Calendar' },
  { keys: ['g', 'm'], label: 'Go to Mail' },
  { keys: ['g', 'r'], label: 'Go to Grades' },
  { keys: ['g', 'n'], label: 'Go to Notes' },
  { keys: ['g', 'i'], label: 'Go to Someday/Maybe' },
  { keys: ['g', 's'], label: 'Go to Spaces' },
  { keys: ['g', ','], label: 'Go to Settings' },
  { keys: ['Esc'], label: 'Close dialog / overlay' },
];

const GOTO: Record<string, string> = {
  h: '/',
  t: '/tasks',
  c: '/calendar',
  m: '/mail',
  r: '/grades',
  n: '/notes',
  i: '/someday',
  s: '/spaces',
  ',': '/settings',
};

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let awaitingG = false;
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    function clearG() {
      awaitingG = false;
      if (gTimeout) { clearTimeout(gTimeout); gTimeout = null; }
    }

    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen((p) => !p);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }

      if (awaitingG) {
        const target = GOTO[e.key.toLowerCase()];
        clearG();
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        awaitingG = true;
        gTimeout = setTimeout(clearG, 1200);
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [open, router]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '1.5rem 1.75rem' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.5rem',
              color: 'var(--beige-light)',
              fontWeight: 400,
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: '0.25rem 0.5rem',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(216, 204, 192,0.03)',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ color: 'var(--beige-light)' }}>{s.label}</span>
              <span style={{ display: 'flex', gap: '0.25rem' }}>
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    style={{
                      display: 'inline-block',
                      minWidth: '1.5rem',
                      textAlign: 'center',
                      padding: '0.125rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(28, 31, 35, 0.88)',
                      border: '1px solid rgba(216, 204, 192,0.18)',
                      color: 'var(--beige-light)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: 'var(--muted)',
            lineHeight: 1.5,
          }}
        >
          Press <kbd style={{ fontSize: '0.6875rem' }}>?</kbd> anywhere to toggle this help. Two-key
          sequences (e.g. <kbd style={{ fontSize: '0.6875rem' }}>g</kbd>{' '}
          <kbd style={{ fontSize: '0.6875rem' }}>t</kbd>) navigate to that page.
        </p>
      </div>
    </div>
  );
}
