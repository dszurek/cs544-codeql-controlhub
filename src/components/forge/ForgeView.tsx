'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface ForgeJob {
  id: string;
  request: string;
  status: string;
  branch: string | null;
  summary: string | null;
  filesChanged: string | null;
  diff?: string | null;
  testOutput?: string | null;
  testsPassed: boolean | null;
  error: string | null;
  createdAt: string;
}

const STATUS_GLOW: Record<string, string> = {
  queued: 'var(--muted)',
  running: 'var(--glow-attend)',
  review: 'var(--leather-light)',
  applied: 'var(--glow-track)',
  discarded: 'var(--muted)',
  failed: 'var(--glow-urgent)',
};

export function ForgeView() {
  const toast = useToast();
  const [jobs, setJobs] = useState<ForgeJob[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [request, setRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ForgeJob | null>(null);

  const load = useCallback(() => {
    fetch('/api/forge')
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs ?? []);
        setEnabled(Boolean(d.enabled));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while anything is in flight so the review card appears when ready.
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'queued' || j.status === 'running')) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [jobs, load]);

  async function setForgeEnabled(on: boolean) {
    setEnabled(on);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'forge_enabled', value: on ? 'on' : 'off' }),
    }).catch(() => toast.error('Failed to update'));
  }

  async function submit() {
    if (request.trim().length < 5) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: request.trim() }),
      });
      if (res.ok) {
        setRequest('');
        toast.success('Forge is working — review card appears when ready');
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to start');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    const res = await fetch(`/api/forge/${id}`);
    if (res.ok) setDetail((await res.json()).job);
  }

  async function apply(job: ForgeJob, force: boolean) {
    const res = await fetch(`/api/forge/${job.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success('Merged to your branch. Rebuild/redeploy to run it live.');
      setOpenId(null);
      load();
    } else {
      toast.error(d.error ?? 'Apply failed');
    }
  }

  async function discard(job: ForgeJob) {
    const res = await fetch(`/api/forge/${job.id}/discard`, { method: 'POST' });
    if (res.ok) {
      toast.success('Discarded');
      setOpenId(null);
      load();
    } else {
      toast.error('Discard failed');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)', maxWidth: 880 }}>
      <div className="surface-head reveal">
        <h1 className="surface-title">Forge</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => void setForgeEnabled(e.target.checked)} />
          {enabled ? 'enabled' : 'disabled'}
        </label>
      </div>

      <div className="glass-pane reveal" style={{ padding: 'var(--sp-4)', borderLeft: '2px solid var(--glow-attend)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--beige)', lineHeight: 1.6 }}>
          The Forge asks Claude to change ControlHub&apos;s own code. Every change is made on an
          isolated branch, tested, and shown to you as a diff — <strong>nothing merges or goes live
          without your review</strong>. Applying merges to your current branch; you still rebuild and
          redeploy to run it.
        </p>
      </div>

      {enabled && (
        <div className="glass-pane reveal" style={{ padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-3)' }}>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="e.g. Add a caffeine tracker widget to the Body tab with a daily total"
            rows={3}
            style={{
              background: 'rgba(42, 47, 53, 0.5)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--beige-light)',
              padding: '0.6rem 0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-inter)',
              resize: 'vertical',
            }}
          />
          <button className="btn-glow" onClick={() => void submit()} disabled={submitting} style={{ justifySelf: 'start' }}>
            {submitting ? 'Starting…' : '⚒ Forge this change'}
          </button>
        </div>
      )}

      {loaded && jobs.length === 0 && (
        <p className="hz-empty">No changes yet.</p>
      )}

      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        {jobs.map((job, i) => (
          <div key={job.id} className="glass-card reveal" style={{ ['--reveal-i' as string]: i }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span
                className="readout"
                style={{ fontSize: '0.5625rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: STATUS_GLOW[job.status] ?? 'var(--muted)' }}
              >
                {job.status}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: '0.875rem', color: 'var(--beige-light)' }}>{job.request}</span>
              {(job.status === 'review' || job.status === 'failed' || job.status === 'applied') && (
                <button className="pill" onClick={() => void openDetail(job.id)}>
                  {openId === job.id ? 'hide' : 'details'}
                </button>
              )}
            </div>

            {job.status === 'review' && (
              <div className="routine-last" style={{ marginTop: 6 }}>
                {job.testsPassed === true ? '✓ tests passed' : job.testsPassed === false ? '✕ tests failed' : '○ tests did not run'}
                {job.filesChanged && ` · ${(JSON.parse(job.filesChanged) as string[]).length} file(s)`}
              </div>
            )}
            {job.error && <div className="routine-last" style={{ marginTop: 6, color: 'var(--glow-urgent)' }}>{job.error}</div>}

            {openId === job.id && (
              <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--hairline)', paddingTop: 'var(--sp-3)' }}>
                {!detail ? (
                  <span className="skeleton" style={{ height: 80 }} />
                ) : (
                  <>
                    {detail.summary && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--beige)', marginBottom: 'var(--sp-3)', whiteSpace: 'pre-line' }}>
                        {detail.summary}
                      </p>
                    )}
                    {detail.diff && (
                      <pre className="forge-diff">
                        {detail.diff.split('\n').map((line, li) => (
                          <span
                            key={li}
                            className={line.startsWith('+') && !line.startsWith('+++') ? 'd-add' : line.startsWith('-') && !line.startsWith('---') ? 'd-del' : line.startsWith('@@') ? 'd-hunk' : undefined}
                          >
                            {line + '\n'}
                          </span>
                        ))}
                      </pre>
                    )}
                    {detail.status === 'review' && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'var(--sp-3)' }}>
                        <button className="btn-glow" onClick={() => void apply(detail, detail.testsPassed === false)}>
                          {detail.testsPassed === false ? '⚠ Apply anyway' : 'Apply'}
                        </button>
                        <button className="pill" onClick={() => void discard(detail)}>Discard</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
