export interface ControlhubAction {
  type: string;
  [key: string]: unknown;
}

/**
 * Extract controlhub-action fenced JSON blocks from assistant text.
 * Returns the stripped text and the parsed actions.
 */
export function extractActions(text: string): { text: string; actions: ControlhubAction[] } {
  const actions: ControlhubAction[] = [];
  const cleaned = text.replace(
    /```controlhub-action\s*([\s\S]*?)```/g,
    (_, body: string) => {
      try {
        const parsed = JSON.parse(body.trim());
        if (Array.isArray(parsed)) {
          for (const a of parsed) if (a && typeof a === 'object' && 'type' in a) actions.push(a as ControlhubAction);
        } else if (parsed && typeof parsed === 'object' && 'type' in parsed) {
          actions.push(parsed as ControlhubAction);
        }
      } catch {
        // ignore malformed blocks — they stay as-is in text below
        return `\`\`\`controlhub-action\n${body}\`\`\``;
      }
      return '';
    },
  );
  return { text: cleaned.trim(), actions };
}
