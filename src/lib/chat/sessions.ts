import { prisma } from '@/lib/db';

export async function getOrCreateSession(
  sessionId: string | undefined,
  backend: 'claude-code' | 'home-assistant',
) {
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (existing) return existing;
  }
  return prisma.chatSession.create({ data: { uuid: '', backend } });
}

export async function appendMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  actions?: unknown,
) {
  return prisma.chatMessage.create({
    data: {
      sessionId,
      role,
      content,
      actions: actions ? JSON.stringify(actions) : null,
    },
  });
}

export async function updateSessionUuid(sessionId: string, uuid: string) {
  await prisma.chatSession.update({ where: { id: sessionId }, data: { uuid } });
}

export async function getSessionMessages(sessionId: string) {
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listSessions() {
  return prisma.chatSession.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
}
