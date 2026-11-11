import * as schedule from 'node-schedule';

let initialized = false;

export function startScheduler(): void {
  if (initialized) return;
  initialized = true;

  // Email + calendar sync every 10 minutes
  schedule.scheduleJob('*/10 * * * *', async () => {
    // Dynamic imports to avoid loading integration modules at startup
    // (they import prisma which needs the DB to be ready)
    try {
      const { sync } = await import('./integrations/outlook');
      await sync();
    } catch { /* logSync already called inside sync() */ }

    try {
      const { sync } = await import('./integrations/gmail');
      await sync();
    } catch { /* logSync already called inside sync() */ }

    try {
      const { sync } = await import('./integrations/icloud');
      await sync();
    } catch { /* logSync already called inside sync() */ }

    try {
      const { sync } = await import('./integrations/ics');
      await sync();
    } catch { /* logSync already called inside sync() */ }

    // Post-sync: triage when untriaged unread accumulate (≥3, or one
    // sitting >2h). Threshold avoids burning a claude run per stray email.
    try {
      const { getSetting } = await import('./settings');
      if ((await getSetting('cortex_auto')) !== 'off') {
        const { prisma } = await import('./db');
        const untriaged = await prisma.email.findMany({
          where: { isRead: false, aiTier: null },
          select: { receivedAt: true },
          orderBy: { receivedAt: 'asc' },
          take: 30,
        });
        const oldest = untriaged[0]?.receivedAt;
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        if (untriaged.length >= 3 || (oldest !== undefined && oldest < twoHoursAgo)) {
          const { enqueueJob, processQueue } = await import('./cortex/runner');
          await enqueueJob('email_triage');
          void processQueue();
        }
      }
    } catch (err) {
      console.error('[cortex] post-sync triage check failed:', err);
    }
  });

  // ── Cortex (AI job engine) ──
  // Queue tick: cheap no-op when nothing is queued; concurrency 1 inside.
  schedule.scheduleJob('* * * * *', async () => {
    try {
      const { processQueue } = await import('./cortex/runner');
      await processQueue();
    } catch (err) {
      console.error('[cortex] queue tick failed:', err);
    }
  });

  // ── Routines (automation engine) ──
  // Minute tick: cheap when no routines reference live data.
  schedule.scheduleJob('* * * * *', async () => {
    try {
      const { runRoutinesTick } = await import('./routines/engine');
      await runRoutinesTick();
    } catch (err) {
      console.error('[routines] tick failed:', err);
    }
  });

  // Recover jobs orphaned by a crash/restart.
  void (async () => {
    try {
      const { recoverStaleJobs } = await import('./cortex/runner');
      await recoverStaleJobs();
      const { recoverStaleForgeJobs } = await import('./forge/runner');
      await recoverStaleForgeJobs();
    } catch { /* tables may not exist on first boot before migrate */ }
  })();

  // Scheduled AI jobs — disable by setting cortex_auto=off in Settings.
  const enqueueIfAuto = async (type: 'briefing' | 'weekly_review' | 'health_insight' | 'plan_day') => {
    try {
      const { getSetting } = await import('./settings');
      if ((await getSetting('cortex_auto')) === 'off') return;
      const { enqueueJob, processQueue } = await import('./cortex/runner');
      await enqueueJob(type);
      void processQueue();
    } catch (err) {
      console.error(`[cortex] failed to enqueue ${type}:`, err);
    }
  };

  schedule.scheduleJob('0 7,19 * * *', () => void enqueueIfAuto('briefing'));      // 12-hour briefing
  schedule.scheduleJob('15 7 * * *', () => void enqueueIfAuto('plan_day'));        // morning plan after briefing
  schedule.scheduleJob('30 8 * * *', () => void enqueueIfAuto('health_insight'));  // after morning HAE push
  schedule.scheduleJob('0 18 * * 0', () => void enqueueIfAuto('weekly_review'));   // Sunday evening
}
