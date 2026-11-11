'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChatPanel, type Backend } from './ChatPanel';
import { ChatIcon, ExpandIcon, CloseIcon } from './ChatIcon';

/**
 * The copilot slide-over: available on every surface. Opens via the
 * FAB or a `controlhub:open-copilot` CustomEvent (optionally carrying
 * a prompt to pre-fill, e.g. from the command palette).
 */
export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [backend, setBackend] = useState<Backend>('claude-code');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    function onOpenCopilot(e: Event) {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      setPrefill(detail?.prompt);
      setOpen(true);
    }
    window.addEventListener('controlhub:open-copilot', onOpenCopilot);
    return () => window.removeEventListener('controlhub:open-copilot', onOpenCopilot);
  }, []);

  // Don't render drawer at all on the full chat page
  if (pathname?.startsWith('/chat')) return null;

  return (
    <>
      {!open && (
        <button className="copilot-fab" onClick={() => setOpen(true)} aria-label="Open copilot">
          <ChatIcon size={22} />
        </button>
      )}
      {open && (
        <div className="copilot-panel">
          <ChatPanel
            key={prefill ?? 'copilot'}
            sessionId={sessionId}
            backend={backend}
            initialInput={prefill}
            onBackendChange={setBackend}
            onSessionChange={setSessionId}
            headerExtras={
              <>
                <Link
                  href="/chat"
                  aria-label="Open full chat page"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    background: 'transparent',
                    border: '1px solid rgba(216, 204, 192, 0.15)',
                    borderRadius: '6px',
                    color: 'var(--muted)',
                    textDecoration: 'none',
                  }}
                >
                  <ExpandIcon size={14} />
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    setPrefill(undefined);
                  }}
                  aria-label="Close copilot"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </>
            }
          />
        </div>
      )}
    </>
  );
}
