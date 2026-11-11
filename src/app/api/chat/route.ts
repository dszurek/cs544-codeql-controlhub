import { NextRequest, NextResponse } from 'next/server';
import { invokeClaudeCode } from '@/lib/chat/claudeCode';
import { invokeHomeAssistant } from '@/lib/chat/homeAssistant';
import { extractActions } from '@/lib/chat/actions';
import {
  appendMessage,
  getOrCreateSession,
  getSessionMessages,
  listSessions,
  updateSessionUuid,
} from '@/lib/chat/sessions';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (sessionId) {
    const messages = await getSessionMessages(sessionId);
    return NextResponse.json({
      messages: messages.map((m) => ({
        ...m,
        actions: m.actions ? JSON.parse(m.actions) : null,
      })),
    });
  }
  const sessions = await listSessions();
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  let body: { message?: string; backend?: 'claude-code' | 'home-assistant'; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, backend = 'claude-code', sessionId } = body;
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (backend !== 'claude-code' && backend !== 'home-assistant') {
    return NextResponse.json({ error: 'invalid backend' }, { status: 400 });
  }

  const session = await getOrCreateSession(sessionId, backend);
  await appendMessage(session.id, 'user', message);

  try {
    if (backend === 'claude-code') {
      const isoDate = new Date().toISOString().slice(0, 10);
      const contextualMessage = session.uuid
        ? message
        : `Today is ${isoDate}. User: ${message}`;
      const result = await invokeClaudeCode({
        message: contextualMessage,
        sessionUuid: session.uuid || undefined,
      });
      if (!session.uuid) await updateSessionUuid(session.id, result.sessionUuid);
      const { text, actions } = extractActions(result.text);
      const saved = await appendMessage(session.id, 'assistant', text, actions);
      return NextResponse.json({
        sessionId: session.id,
        message: { ...saved, actions },
      });
    } else {
      const result = await invokeHomeAssistant({
        message,
        conversationId: session.uuid || undefined,
      });
      if (!session.uuid && result.conversationId)
        await updateSessionUuid(session.id, result.conversationId);
      const saved = await appendMessage(session.id, 'assistant', result.text, []);
      return NextResponse.json({
        sessionId: session.id,
        message: { ...saved, actions: [] },
      });
    }
  } catch (err) {
    const errorText = err instanceof Error ? err.message : String(err);
    await appendMessage(session.id, 'assistant', `Error: ${errorText}`, []);
    return NextResponse.json({ error: errorText, sessionId: session.id }, { status: 502 });
  }
}
