import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { invokeClaudeCode } from '@/lib/chat/claudeCode';
import { extractJsonBlock } from '@/lib/cortex/json';

interface TriageItem {
  id: string;
  category: 'reply' | 'task' | 'archive' | 'spam';
  reason: string;
  suggestedTask?: string;
}

const TRIAGE_PROMPT = (emailsJson: string) => `You are ControlHub's inbox triage agent. Classify each of the following unread emails into
one of four categories:

- "reply" — needs a personal reply from the user
- "task" — action item that should become a task (supply a concise task title)
- "archive" — informational, no action needed
- "spam" — low-value, promotional, or automated noise

Output EXACTLY one JSON block at the end of your response and no prose after it:

\`\`\`json
{
  "items": [
    { "id": "<emailId>", "category": "<reply|task|archive|spam>", "reason": "<short reason>", "suggestedTask": "<optional task title if category=task>" }
  ]
}
\`\`\`

Emails:
${emailsJson}`;

function extractJson(text: string): { items: TriageItem[] } | null {
  const parsed = extractJsonBlock(text) as { items?: unknown } | null;
  if (!parsed || !Array.isArray(parsed.items)) return null;
  const items: TriageItem[] = (parsed.items as unknown[])
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x): TriageItem => ({
      id: String(x.id ?? ''),
      category: (['reply', 'task', 'archive', 'spam'] as const).includes(
        x.category as 'reply' | 'task' | 'archive' | 'spam',
      )
        ? (x.category as TriageItem['category'])
        : 'archive',
      reason: typeof x.reason === 'string' ? x.reason : '',
      suggestedTask: typeof x.suggestedTask === 'string' ? x.suggestedTask : undefined,
    }))
    .filter((x) => x.id);
  return { items };
}

export async function POST() {
  const emails = await prisma.email.findMany({
    where: { isRead: false },
    orderBy: { receivedAt: 'desc' },
    take: 25,
    select: {
      id: true,
      subject: true,
      senderName: true,
      senderEmail: true,
      preview: true,
      receivedAt: true,
    },
  });

  if (emails.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const compact = emails.map((e) => ({
    id: e.id,
    from: `${e.senderName || ''} <${e.senderEmail}>`.trim(),
    subject: e.subject,
    preview: (e.preview ?? '').slice(0, 240),
    receivedAt: e.receivedAt.toISOString(),
  }));

  try {
    const result = await invokeClaudeCode({
      message: TRIAGE_PROMPT(JSON.stringify(compact, null, 2)),
      model: 'sonnet',
    });
    const parsed = extractJson(result.text);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Could not parse triage response', raw: result.text.slice(0, 500) },
        { status: 502 },
      );
    }
    return NextResponse.json({ items: parsed.items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
