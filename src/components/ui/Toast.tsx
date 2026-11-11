'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  handler: () => void | Promise<void>;
}

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  leaving?: boolean;
}

interface ToastOptions {
  kind?: ToastKind;
  action?: ToastAction;
  ttl?: number;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: Omit<ToastOptions, 'kind'>) => void;
  error: (message: string, options?: Omit<ToastOptions, 'kind'>) => void;
  info: (message: string, options?: Omit<ToastOptions, 'kind'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

const DEFAULT_TTL = 4000;
const UNDO_TTL = 8000;
const EXIT_MS = 180;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const push = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const kind: ToastKind = options.kind ?? 'info';
      const item: ToastItem = { id, kind, message, action: options.action };
      setItems((prev) => [...prev, item]);
      const ttl = options.ttl ?? (options.action ? UNDO_TTL : DEFAULT_TTL);
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (m, o) => push(m, { ...o, kind: 'success' }),
      error: (m, o) => push(m, { ...o, kind: 'error' }),
      info: (m, o) => push(m, { ...o, kind: 'info' }),
    }),
    [push],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as { __toast?: ToastContextValue }).__toast = value;
  }, [value]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.kind}${t.leaving ? ' leave' : ''}`}
            role="status"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.action && (
              <button
                onClick={async () => {
                  try {
                    await t.action!.handler();
                  } finally {
                    dismiss(t.id);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(216, 204, 192,0.25)',
                  color: 'var(--beige-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                padding: '0 0.125rem',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
