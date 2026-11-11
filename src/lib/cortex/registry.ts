import { prisma } from '@/lib/db';
import { invokeClaudeCode } from '@/lib/chat/claudeCode';
import { runBriefing, getLatestBriefing } from '@/lib/briefing';
import { getHealthSummary } from '@/lib/health/ingest';
import { extractJsonBlock, asString, asStringArray, asGlow } from './json';

export type JobType = 'briefing' | 'weekly_review' | 'health_insight' | 'plan_day' | 'email_triage';

export interface NewSignal {
  kind: string;
  title: string;
  body: string;
  data?: unknown;
  glow: 'track' | 'attend' | 'urgent';
}

export interface JobOutcome {
  result: unknown;
  signal: NewSignal | null;
}

export interface JobDef {
  type: JobType;
  timeoutMs: number;
  execute(payload: unknown): Promise<JobOutcome>;
}

const CORTEX_SYSTEM_PROMPT =
  'You are a ControlHub Cortex background job. Use only the MCP tools you have been given. ' +
  'Be factual and concise. End your response with EXACTLY one ```json fenced block matching ' +
  'the schema you were asked for — no prose after it.';

const HEALTH_TOOLS = [
  'mcp__controlhub__query_health_daily',
  'mcp__controlhub__query_health_samples',
  'mcp__controlhub__get_health_baselines',
];

const REVIEW_TOOLS = [
  'mcp__controlhub__list_tasks',
  'mcp__controlhub__list_events',
  'mcp__controlhub__get_unread_summary',
  ...HEALTH_TOOLS,
];

/** Briefing rides Cortex but keeps its proven implementation + Briefing rows. */
const briefingJob: JobDef = {
  type: 'briefing',
  timeoutMs: 4 * 60_000,
  async execute() {
    const res = await runBriefing();
    if (!res.ok) throw new Error(res.error ?? 'briefing failed');
    const latest = await getLatestBriefing();
    return {
      result: { briefingId: latest?.id ?? null },
      signal: latest && latest.summary
        ? {
            kind: 'briefing',
            title: 'Briefing',
            body: latest.summary,
            data: { briefingId: latest.id },
            glow: 'attend' as const,
          }
        : null,
    };
  },
};

interface WeeklyReviewResult {
  summary: string;
  wins: string[];
  adjustments: string[];
}

function validateWeeklyReview(parsed: unknown): WeeklyReviewResult | null {
  const p = parsed as Record<string, unknown> | null;
  const summary = asString(p?.summary);
  if (!summary) return null;
  return { summary, wins: asStringArray(p?.wins), adjustments: asStringArray(p?.adjustments) };
}

const weeklyReviewJob: JobDef = {
  type: 'weekly_review',
  timeoutMs: 6 * 60_000,
  async execute() {
    const prompt = `Produce the user's weekly review. Investigate with your tools:
- list_tasks (status=completed) for what got done this week; list_tasks (view=all) for what's pending/slipping
- list_events for the past and coming week (today is ${new Date().toDateString()})
- get_health_baselines + query_health_daily for sleep/HRV/readiness patterns this week

Write an honest, specific review (markdown, under 250 words): what actually got done, what slipped and why it
matters, how the body held up (sleep debt, readiness trend), and 2-3 concrete adjustments for next week.
Correlate where the data supports it (e.g. short sleep midweek → fewer completions Thursday).

End with one \`\`\`json block: {"summary": "<the markdown review>", "wins": ["..."], "adjustments": ["..."]}`;

    const res = await invokeClaudeCode({
      message: prompt,
      systemPrompt: CORTEX_SYSTEM_PROMPT,
      allowedTools: REVIEW_TOOLS,
      timeoutMs: this.timeoutMs,
      lowPriority: true,
    });
    const parsed = validateWeeklyReview(extractJsonBlock(res.text));
    if (!parsed) throw new Error('weekly_review: response failed validation');
    return {
      result: parsed,
      signal: {
        kind: 'weekly_review',
        title: 'Weekly review',
        body: parsed.summary,
        data: { wins: parsed.wins, adjustments: parsed.adjustments },
        glow: 'track',
      },
    };
  },
};

interface HealthInsightResult {
  headline: string;
  insight: string;
  suggestion: string;
  glow: 'track' | 'attend' | 'urgent';
}

function validateHealthInsight(parsed: unknown): HealthInsightResult | null {
  const p = parsed as Record<string, unknown> | null;
  const headline = asString(p?.headline);
  const insight = asString(p?.insight);
  if (!headline || !insight) return null;
  return { headline, insight, suggestion: asString(p?.suggestion) ?? '', glow: asGlow(p?.glow) };
}

const healthInsightJob: JobDef = {
  type: 'health_insight',
  timeoutMs: 4 * 60_000,
  async execute() {
    const summary = await getHealthSummary();
    if (!summary.hasData) {
      return { result: { skipped: 'no health data yet' }, signal: null };
    }

    const prompt = `Today's health snapshot (interpret against the user's own baselines, not population norms):
${JSON.stringify({ latest: summary.latest, baselines: summary.baselines, trend: summary.trend }, null, 2)}

Use query_health_samples if you need finer-grained drill-down (e.g. when HRV dipped overnight).
Identify the single most useful insight for today — an anomaly, a trend forming, or a recovery signal —
and one concrete suggestion. Skip pleasantries.

End with one \`\`\`json block:
{"headline": "<one line>", "insight": "<2-3 sentences, markdown>", "suggestion": "<one concrete action>",
 "glow": "track|attend|urgent"}  // track = on-track, attend = worth attention, urgent = act today`;

    const res = await invokeClaudeCode({
      message: prompt,
      systemPrompt: CORTEX_SYSTEM_PROMPT,
      allowedTools: HEALTH_TOOLS,
      timeoutMs: this.timeoutMs,
      lowPriority: true,
    });
    const parsed = validateHealthInsight(extractJsonBlock(res.text));
    if (!parsed) throw new Error('health_insight: response failed validation');
    return {
      result: parsed,
      signal: {
        kind: 'health_insight',
        title: parsed.headline,
        body: `${parsed.insight}${parsed.suggestion ? `\n\n**Try:** ${parsed.suggestion}` : ''}`,
        glow: parsed.glow,
      },
    };
  },
};

interface PlanDayResult {
  commentary: string;
}

function validatePlanDay(parsed: unknown): PlanDayResult | null {
  const commentary = asString((parsed as Record<string, unknown> | null)?.commentary);
  return commentary ? { commentary } : null;
}

/** Deterministic replan first; Claude only explains the result. */
const planDayJob: JobDef = {
  type: 'plan_day',
  timeoutMs: 4 * 60_000,
  async execute() {
    const { replanToday } = await import('@/lib/flow');
    const blocks = await replanToday();
    if (blocks.length === 0) {
      return { result: { blocks: [] }, signal: null };
    }

    const planText = blocks
      .map((b) => {
        const fmt = (iso: string) =>
          new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${fmt(b.start)}–${fmt(b.end)}  ${b.title} (P${b.priority}${b.pinned ? ', pinned' : ''})`;
      })
      .join('\n');

    const prompt = `Flow (the deterministic scheduler) just planned the user's day:

${planText}

Use list_tasks and list_events if you need context on why these matter. Write 2-4 sentences explaining
the shape of the day — lead with what matters most and why it's placed where it is (energy, deadlines).
Mention anything at risk. No restating the whole list.

End with one \`\`\`json block: {"commentary": "<the explanation, markdown>"}`;

    const res = await invokeClaudeCode({
      message: prompt,
      systemPrompt: CORTEX_SYSTEM_PROMPT,
      allowedTools: [
        'mcp__controlhub__list_tasks',
        'mcp__controlhub__list_events',
        ...HEALTH_TOOLS,
      ],
      timeoutMs: this.timeoutMs,
      lowPriority: true,
    });
    const parsed = validatePlanDay(extractJsonBlock(res.text));
    // The plan itself succeeded even if the commentary didn't parse.
    return {
      result: { blocks, commentary: parsed?.commentary ?? null },
      signal: {
        kind: 'plan_day',
        title: `Today's plan — ${blocks.length} block${blocks.length === 1 ? '' : 's'}`,
        body: parsed?.commentary ?? planText,
        data: { blocks },
        glow: 'attend',
      },
    };
  },
};

const EMAIL_TIERS = ['urgent', 'reply', 'fyi', 'noise'] as const;
export type EmailTier = (typeof EMAIL_TIERS)[number];

export interface TriageClassification {
  id: string;
  tier: EmailTier;
  summary: string;
}

export interface RuleSuggestion {
  pattern: string;
  action: 'mute' | 'alert';
  reason: string;
}

export interface EmailTriageResult {
  classifications: TriageClassification[];
  ruleSuggestions: RuleSuggestion[];
}

function validateEmailTriage(parsed: unknown): EmailTriageResult | null {
  const p = parsed as Record<string, unknown> | null;
  if (!p || !Array.isArray(p.classifications)) return null;
  const classifications: TriageClassification[] = [];
  for (const raw of p.classifications) {
    const id = asString((raw as Record<string, unknown>)?.id);
    const tier = (raw as Record<string, unknown>)?.tier;
    if (!id || !EMAIL_TIERS.includes(tier as EmailTier)) continue;
    classifications.push({
      id,
      tier: tier as EmailTier,
      summary: asString((raw as Record<string, unknown>)?.summary) ?? '',
    });
  }
  const ruleSuggestions: RuleSuggestion[] = [];
  if (Array.isArray(p.ruleSuggestions)) {
    for (const raw of p.ruleSuggestions) {
      const r = raw as Record<string, unknown>;
      const pattern = asString(r?.pattern);
      const action = r?.action === 'mute' || r?.action === 'alert' ? r.action : null;
      if (!pattern || !action) continue;
      ruleSuggestions.push({ pattern, action, reason: asString(r?.reason) ?? '' });
    }
  }
  return { classifications, ruleSuggestions };
}

const STALE_REPLY_DAYS = 3;

const emailTriageJob: JobDef = {
  type: 'email_triage',
  timeoutMs: 5 * 60_000,
  async execute(payload) {
    const ids = asStringArray((payload as Record<string, unknown> | null)?.emailIds);
    const emails = await prisma.email.findMany({
      where: ids.length > 0 ? { id: { in: ids } } : { isRead: false, aiTier: null },
      // Oldest-first, matching the scheduler's trigger (scheduler.ts). If this
      // drained newest-first while the trigger keys on the oldest, a backlog of
      // >30 would never reach its tail — the trigger would stay true and enqueue
      // a claude run on every 10-minute sync forever.
      orderBy: { receivedAt: 'asc' },
      take: 30,
    });
    if (emails.length === 0) return { result: { classified: 0 }, signal: null };

    const inline = emails.map((e) => ({
      id: e.id,
      from: `${e.senderName} <${e.senderEmail}>`,
      subject: e.subject,
      preview: e.preview?.slice(0, 160) ?? null,
      receivedAt: e.receivedAt.toISOString(),
    }));

    const prompt = `Triage these unread emails. Tiers:
- "urgent"  — time-sensitive, consequences if missed today
- "reply"   — needs a personal reply, not necessarily today
- "fyi"     — worth knowing, no action
- "noise"   — promotional/automated/ignorable

For each: tier + a ONE-LINE summary (what it actually says/wants, max ~15 words).
Also: check list_email_rules, and if a sender here is chronically ignorable (use list_emails to
see their history with the user), suggest a mute rule — only when the pattern is unmistakable.

Emails:
${JSON.stringify(inline, null, 2)}

End with one \`\`\`json block:
{"classifications": [{"id": "...", "tier": "urgent|reply|fyi|noise", "summary": "..."}],
 "ruleSuggestions": [{"pattern": "<sender substring>", "action": "mute|alert", "reason": "..."}]}`;

    const res = await invokeClaudeCode({
      message: prompt,
      systemPrompt: CORTEX_SYSTEM_PROMPT,
      allowedTools: [
        'mcp__controlhub__list_emails',
        'mcp__controlhub__list_email_rules',
        'mcp__controlhub__get_unread_summary',
      ],
      timeoutMs: this.timeoutMs,
      lowPriority: true,
    });
    const parsed = validateEmailTriage(extractJsonBlock(res.text));
    if (!parsed) throw new Error('email_triage: response failed validation');

    const validIds = new Set(emails.map((e) => e.id));
    for (const c of parsed.classifications) {
      if (!validIds.has(c.id)) continue;
      await prisma.email.update({
        where: { id: c.id },
        data: { aiTier: c.tier, aiSummary: c.summary || null },
      });
    }

    const counts = { urgent: 0, reply: 0, fyi: 0, noise: 0 } as Record<EmailTier, number>;
    for (const c of parsed.classifications) {
      if (validIds.has(c.id)) counts[c.tier]++;
    }

    // Reply-pending digest: classified-as-reply mail that's been sitting.
    const staleSince = new Date(Date.now() - STALE_REPLY_DAYS * 24 * 60 * 60 * 1000);
    const staleReplies = await prisma.email.count({
      where: { aiTier: 'reply', isRead: false, receivedAt: { lt: staleSince } },
    });

    const urgentLines = parsed.classifications
      .filter((c) => c.tier === 'urgent' && validIds.has(c.id))
      .map((c) => {
        const e = emails.find((x) => x.id === c.id);
        return `- **${e?.senderName ?? '?'}**: ${c.summary || e?.subject}`;
      });

    const bodyParts: string[] = [];
    if (urgentLines.length > 0) bodyParts.push(urgentLines.join('\n'));
    if (staleReplies > 0) {
      bodyParts.push(`${staleReplies} email${staleReplies === 1 ? '' : 's'} still awaiting your reply after ${STALE_REPLY_DAYS}+ days.`);
    }
    if (parsed.ruleSuggestions.length > 0) {
      bodyParts.push(
        parsed.ruleSuggestions
          .map((r) => `Suggested ${r.action} rule for "${r.pattern}" — ${r.reason}`)
          .join('\n'),
      );
    }

    return {
      result: { counts, ruleSuggestions: parsed.ruleSuggestions },
      signal: {
        kind: 'email_triage',
        title: `Inbox triaged — ${counts.urgent} urgent · ${counts.reply} need replies · ${counts.noise} noise`,
        body: bodyParts.join('\n\n') || 'Nothing demands attention.',
        data: { counts },
        glow: counts.urgent > 0 ? 'urgent' : counts.reply > 0 ? 'attend' : 'track',
      },
    };
  },
};

export const JOB_REGISTRY: Record<JobType, JobDef> = {
  briefing: briefingJob,
  weekly_review: weeklyReviewJob,
  health_insight: healthInsightJob,
  plan_day: planDayJob,
  email_triage: emailTriageJob,
};

export function isJobType(type: string): type is JobType {
  return type in JOB_REGISTRY;
}

export { validateWeeklyReview, validateHealthInsight, validateEmailTriage };

export async function createSignal(jobId: string | null, s: NewSignal): Promise<void> {
  await prisma.signal.create({
    data: {
      kind: s.kind,
      title: s.title,
      body: s.body,
      data: s.data === undefined ? null : JSON.stringify(s.data),
      glow: s.glow,
      jobId,
    },
  });
}
