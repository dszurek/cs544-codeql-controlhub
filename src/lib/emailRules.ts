import { prisma } from './db';

export type EmailRuleAction = 'alert' | 'mute' | 'spam';
export type EmailRuleMatchType = 'contains' | 'exact' | 'regex';

export interface EmailRuleInput {
  pattern: string;
  matchType?: EmailRuleMatchType;
  action: EmailRuleAction;
  label?: string;
}

export async function listEmailRules() {
  return prisma.emailRule.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createEmailRule(input: EmailRuleInput) {
  return prisma.emailRule.create({
    data: {
      pattern: input.pattern,
      matchType: input.matchType ?? 'contains',
      action: input.action,
      label: input.label,
    },
  });
}

export async function deleteEmailRule(id: string) {
  await prisma.emailRule.delete({ where: { id } });
}

/**
 * Build a Prisma `where` clause matching emails that match ANY of the
 * given rules (OR'd). `regex` match type falls back to DB-level `contains`
 * since SQLite lacks server-side regex.
 */
export async function getSpamEmailIds(): Promise<string[]> {
  const spamRules = await prisma.emailRule.findMany({ where: { action: 'spam' } });
  if (spamRules.length === 0) return [];

  const orClauses = spamRules.map((r) => {
    if (r.matchType === 'exact') return { senderEmail: r.pattern };
    return {
      OR: [
        { senderEmail: { contains: r.pattern } },
        { senderName: { contains: r.pattern } },
      ],
    };
  });

  const matches = await prisma.email.findMany({
    where: { OR: orClauses },
    select: { id: true },
  });
  return matches.map((m) => m.id);
}

export interface MailInsights {
  outlook: number;
  gmail: number;
  alerts: Array<{
    ruleId: string;
    label: string;
    pattern: string;
    count: number;
    latest: {
      id: string;
      subject: string;
      senderName: string;
      senderEmail: string;
      receivedAt: Date;
    } | null;
  }>;
}

export async function getMailInsights(): Promise<MailInsights> {
  const [outlook, gmail, rules] = await Promise.all([
    prisma.email.count({ where: { source: 'outlook', isRead: false } }),
    prisma.email.count({ where: { source: 'gmail', isRead: false } }),
    prisma.emailRule.findMany({ where: { action: 'alert' } }),
  ]);

  const alerts: MailInsights['alerts'] = [];
  for (const rule of rules) {
    let where: Record<string, unknown> = { isRead: false };
    if (rule.matchType === 'exact') {
      where = { ...where, senderEmail: rule.pattern };
    } else {
      // 'contains' and 'regex' both fall back to substring match at DB level;
      // true regex would be done in-memory but isn't worth the cost for v1.
      where = {
        ...where,
        OR: [
          { senderEmail: { contains: rule.pattern } },
          { senderName: { contains: rule.pattern } },
        ],
      };
    }
    const [count, latest] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findFirst({ where, orderBy: { receivedAt: 'desc' } }),
    ]);
    if (count > 0) {
      alerts.push({
        ruleId: rule.id,
        label: rule.label ?? rule.pattern,
        pattern: rule.pattern,
        count,
        latest: latest
          ? {
              id: latest.id,
              subject: latest.subject,
              senderName: latest.senderName,
              senderEmail: latest.senderEmail,
              receivedAt: latest.receivedAt,
            }
          : null,
      });
    }
  }
  return { outlook, gmail, alerts };
}
