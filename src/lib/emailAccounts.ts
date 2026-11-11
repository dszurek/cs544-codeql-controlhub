import { prisma } from './db';
import type { EmailAccount } from '@prisma/client';

export const MAX_ACCOUNTS = 10;

export async function listEmailAccounts(): Promise<EmailAccount[]> {
  return prisma.emailAccount.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function countEmailAccounts(): Promise<number> {
  return prisma.emailAccount.count();
}

export async function createEmailAccount(input: {
  provider: string;
  email: string;
  label?: string;
}): Promise<EmailAccount> {
  return prisma.emailAccount.create({
    data: {
      provider: input.provider,
      email: input.email,
      label: input.label,
    },
  });
}

export async function updateEmailAccount(
  id: string,
  data: Partial<{ label: string | null; enabled: boolean }>,
): Promise<EmailAccount> {
  return prisma.emailAccount.update({ where: { id }, data });
}

export async function deleteEmailAccount(id: string): Promise<void> {
  await prisma.emailAccount.delete({ where: { id } });
}
