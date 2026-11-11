import type { Email } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { getSpamEmailIds } from './emailRules';

export interface GetEmailsOptions {
  source?: string;
  isRead?: boolean;
  folder?: 'inbox' | 'spam';
}

export async function getEmails(options: GetEmailsOptions = {}): Promise<Email[]> {
  const { source, isRead, folder = 'inbox' } = options;

  const where: Prisma.EmailWhereInput = {};

  if (source !== undefined) where.source = source;
  if (isRead !== undefined) where.isRead = isRead;

  const spamIds = await getSpamEmailIds();
  if (folder === 'spam') {
    if (spamIds.length === 0) return [];
    where.id = { in: spamIds };
  } else if (spamIds.length > 0) {
    where.id = { notIn: spamIds };
  }

  return prisma.email.findMany({
    where,
    orderBy: { receivedAt: 'desc' },
  });
}

export async function upsertEmail(data: {
  subject: string;
  senderName: string;
  senderEmail: string;
  preview?: string;
  isRead?: boolean;
  receivedAt: Date;
  source: string;
  sourceId: string;
}): Promise<Email> {
  const { source, sourceId, ...rest } = data;

  return prisma.email.upsert({
    where: { source_sourceId: { source, sourceId } },
    create: { source, sourceId, ...rest },
    update: rest,
  });
}

export async function markEmailRead(id: string, isRead: boolean): Promise<Email> {
  return prisma.email.update({
    where: { id },
    data: { isRead },
  });
}

export async function getUnreadCounts(): Promise<{ outlook: number; gmail: number }> {
  const [outlook, gmail] = await Promise.all([
    prisma.email.count({ where: { source: 'outlook', isRead: false } }),
    prisma.email.count({ where: { source: 'gmail', isRead: false } }),
  ]);

  return { outlook, gmail };
}
