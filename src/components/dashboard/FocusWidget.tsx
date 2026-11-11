'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/Toast';

interface CurrentBlock {
  id: string;
  title: string;
  status: string;
  blockStart: string;
  blockEnd: string;
}

type Phase = 'focus' | 'break';

const DURATIONS: Record<Phase, number> = {
  focus: 25 * 60,
  break: 5 * 60,
};

const STORAGE_KEY = 'controlhub.focus.v1';

interface Persisted {
  phase: Phase;
  remaining: number;
  running: boolean;
  completed: number;
  updatedAt: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function loadState(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Persisted;
    if (data.running) {
      const elapsed = Math.floor((Date.now() - data.updatedAt) / 1000);
      data.remaining = Math.max(0, data.remaining - elapsed);
      if (data.remaining === 0) {
        data.running = false;
      }
    }
    return data;
  } catch {
    return null;
  }
}

function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.7);
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* silent */
  }
}

export function FocusWidget() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('focus');
  const [remaining, setRemaining] = useState<number>(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [ready, setReady] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<CurrentBlock | null>(null);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 60_000);
      const end = new Date(now.getTime() + 60 * 60_000);
      try {
        const r = await fetch(
          `/api/tasks/blocks?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
        );
        if (!r.ok) return;
        const j = (await r.json()) as { blocks: CurrentBlock[] };
        const nowMs = Date.now();
        const active = (j.blocks ?? []).find((b) => {
          const s = new Date(b.blockStart).getTime();
          const e = new Date(b.blockEnd).getTime();
          return s <= nowMs && e > nowMs && b.status !== 'completed';
        });
        if (!cancelled) setCurrentBlock(active ?? null);
      } catch {
        /* ignore */
      }
    }
    load();
    const i = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  useEffect(() => {
    const data = loadState();
    if (data) {
      setPhase(data.phase);
      setRemaining(data.remaining);
      setRunning(data.running);
      setCompleted(data.completed);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Persisted = {
      phase,
      remaining,
      running,
      completed,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [phase, remaining, running, completed, ready]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setPhase((currentPhase) => {
            const nextPhase: Phase = currentPhase === 'focus' ? 'break' : 'focus';
            setRemaining(DURATIONS[nextPhase]);
            if (currentPhase === 'focus') {
              setCompleted((c) => c + 1);
              toastRef.current.success('Focus done — take a 5-min break');
            } else {
              toastRef.current.info('Break over — ready to focus');
            }
            playChime();
            return nextPhase;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const total = DURATIONS[phase];
  const pct = Math.max(0, Math.min(1, remaining / total));
  const progressAngle = (1 - pct) * 360;

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(DURATIONS[phase]);
  }, [phase]);
  const skip = useCallback(() => {
    const nextPhase: Phase = phase === 'focus' ? 'break' : 'focus';
    setPhase(nextPhase);
    setRemaining(DURATIONS[nextPhase]);
    setRunning(false);
  }, [phase]);

  const ringSize = 120;
  const ringColor =
    phase === 'focus' ? 'rgba(199, 154, 107,0.9)' : 'rgba(111,158,122,0.9)';

  return (
    <GlassCard>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <h2
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--leather-light)',
            fontWeight: 600,
          }}
        >
          Focus
        </h2>
        <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
          {completed} {completed === 1 ? 'pomodoro' : 'pomodoros'} today
        </span>
      </div>

      {currentBlock && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.625rem',
            marginBottom: '0.625rem',
            background:
              'repeating-linear-gradient(45deg, rgba(93,109,72,0.2) 0 6px, rgba(93,109,72,0.08) 6px 12px)',
            border: '1px dashed rgba(93,109,72,0.5)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ color: 'var(--leather-light)', letterSpacing: '0.04em' }}>⧗ Now</span>
          <button
            onClick={() => router.push(`/tasks/${currentBlock.id}`)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--beige-light)',
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.75rem',
              flex: 1,
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={currentBlock.title}
          >
            {currentBlock.title}
          </button>
          {!running && (
            <button
              onClick={() => setRunning(true)}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(176, 122, 79,0.3)',
                border: '1px solid rgba(176, 122, 79,0.55)',
                color: 'var(--beige-light)',
                fontSize: '0.6875rem',
                cursor: 'pointer',
              }}
            >
              Start focus
            </button>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: ringSize,
            height: ringSize,
            borderRadius: '50%',
            background: `conic-gradient(${ringColor} ${progressAngle}deg, rgba(216, 204, 192,0.1) ${progressAngle}deg)`,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            transition: 'background 200ms var(--ease-out)',
          }}
        >
          <div
            style={{
              width: ringSize - 18,
              height: ringSize - 18,
              borderRadius: '50%',
              background: 'rgba(28, 31, 35, 0.90)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-playfair)',
                  fontSize: '1.5rem',
                  color: 'var(--beige-light)',
                  lineHeight: 1,
                }}
              >
                {formatTime(remaining)}
              </div>
              <div
                style={{
                  fontSize: '0.625rem',
                  color: 'var(--muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '0.25rem',
                }}
              >
                {phase}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
          <button
            onClick={toggle}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: running ? 'rgba(220,53,69,0.14)' : 'rgba(176, 122, 79,0.3)',
              border: `1px solid ${running ? 'rgba(220,53,69,0.4)' : 'rgba(176, 122, 79,0.55)'}`,
              color: 'var(--beige-light)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background var(--motion-fast) var(--ease-out)',
            }}
          >
            {running ? 'Pause' : 'Start'}
          </button>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: '0.375rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: '1px solid rgba(216, 204, 192,0.2)',
                color: 'var(--muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
            <button
              onClick={skip}
              style={{
                flex: 1,
                padding: '0.375rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: '1px solid rgba(216, 204, 192,0.2)',
                color: 'var(--muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
