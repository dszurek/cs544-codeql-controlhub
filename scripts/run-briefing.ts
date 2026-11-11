#!/usr/bin/env -S npx tsx
import { runBriefing } from '../src/lib/briefing';

async function main() {
  const model = process.argv[2] ?? 'sonnet';
  console.log(`[briefing] starting run (model=${model})`);
  const result = await runBriefing(model);
  if (result.ok) {
    console.log('[briefing] complete');
    process.exit(0);
  }
  console.error(`[briefing] failed: ${result.error ?? 'unknown error'}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('[briefing] unexpected error:', err);
  process.exit(1);
});
