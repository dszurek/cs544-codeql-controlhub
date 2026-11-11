import { describe, it, expect } from 'vitest';
import { groupByTier, type EmailData } from '@/components/mail/EmailList';

function email(overrides: Partial<EmailData>): EmailData {
  return {
    id: Math.random().toString(36).slice(2),
    subject: 's',
    senderName: 'n',
    senderEmail: 'n@x.com',
    preview: null,
    isRead: false,
    receivedAt: new Date().toISOString(),
    source: 'gmail',
    ...overrides,
  };
}

describe('groupByTier', () => {
  it('orders tiers urgent → reply → fyi → untriaged → noise', () => {
    const groups = groupByTier([
      email({ aiTier: 'noise' }),
      email({ aiTier: null }),
      email({ aiTier: 'urgent' }),
      email({ aiTier: 'fyi' }),
      email({ aiTier: 'reply' }),
    ]);
    expect(groups.map((g) => g.tier)).toEqual(['urgent', 'reply', 'fyi', 'untriaged', 'noise']);
  });

  it('omits empty tiers and treats unknown tiers as untriaged', () => {
    const groups = groupByTier([email({ aiTier: 'banana' }), email({ aiTier: 'urgent' })]);
    expect(groups.map((g) => g.tier)).toEqual(['urgent', 'untriaged']);
  });

  it('keeps input order within a tier', () => {
    const a = email({ aiTier: 'reply', subject: 'first' });
    const b = email({ aiTier: 'reply', subject: 'second' });
    const groups = groupByTier([a, b]);
    expect(groups[0].emails.map((e) => e.subject)).toEqual(['first', 'second']);
  });
});
