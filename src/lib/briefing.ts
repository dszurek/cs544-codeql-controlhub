import { prisma } from './db';
import { invokeClaudeCode } from './chat/claudeCode';
import { extractJsonBlock as extractJson } from './cortex/json';

export interface BriefingPayload {
  summary: string;
  priorityTaskIds: string[];
  priorityEmailIds: string[];
}

const BRIEFING_PROMPT = `You are ControlHub's briefing agent. Use the controlhub MCP tools to analyze
the user's current state across tasks, emails, and calendar events. Produce a concise 12-hour
briefing in under 200 words that highlights:

- What's due or overdue today and tomorrow
- Which unread emails look actionable
- Meetings or events in the next 12 hours
- Risks, conflicts, or anything that needs attention

Then identify up to 8 priority task IDs and 5 priority email IDs that the user should focus on first.

Output EXACTLY one JSON block at the end of your response, no prose after it:

\`\`\`json
{
  "summary": "<markdown summary here>",
  "priorityTaskIds": ["id1", "id2"],
  "priorityEmailIds": ["id3"]
}
\`\`\`

The summary should be plain markdown with short bullets. Do not include the IDs in the summary.`;

function parseBriefingPayload(text: string): BriefingPayload | null {
  const parsed = extractJson(text) as Record<string, unknown> | null;
  if (!parsed || typeof parsed.summary !== 'string') return null;
  return {
    summary: parsed.summary,
    priorityTaskIds: Array.isArray(parsed.priorityTaskIds)
      ? parsed.priorityTaskIds.filter((x: unknown): x is string => typeof x === 'string')
      : [],
    priorityEmailIds: Array.isArray(parsed.priorityEmailIds)
      ? parsed.priorityEmailIds.filter((x: unknown): x is string => typeof x === 'string')
      : [],
  };
}

export async function runBriefing(model = 'sonnet'): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await invokeClaudeCode({ message: BRIEFING_PROMPT, model });
    const payload = parseBriefingPayload(result.text);
    if (!payload) {
      await prisma.briefing.create({
        data: {
          summary: result.text.slice(0, 2000),
          model,
          error: 'Could not parse JSON payload from response',
        },
      });
      return { ok: false, error: 'Parse error' };
    }

    await prisma.$transaction([
      prisma.task.updateMany({ where: { aiPriority: true }, data: { aiPriority: false } }),
      prisma.email.updateMany({ where: { aiPriority: true }, data: { aiPriority: false } }),
    ]);

    if (payload.priorityTaskIds.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: payload.priorityTaskIds } },
        data: { aiPriority: true },
      });
    }
    if (payload.priorityEmailIds.length > 0) {
      await prisma.email.updateMany({
        where: { id: { in: payload.priorityEmailIds } },
        data: { aiPriority: true },
      });
    }

    await prisma.briefing.create({
      data: {
        summary: payload.summary,
        priorityTasks: JSON.stringify(payload.priorityTaskIds),
        priorityEmails: JSON.stringify(payload.priorityEmailIds),
        model,
      },
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.briefing.create({
      data: { summary: '', model, error: message },
    });
    return { ok: false, error: message };
  }
}

export async function getLatestBriefing() {
  return prisma.briefing.findFirst({ orderBy: { createdAt: 'desc' } });
}
