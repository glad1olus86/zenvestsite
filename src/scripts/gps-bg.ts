/**
 * Standalone background GPS poller.
 * Runs independently from Next.js — works even when nobody has the site open.
 *
 * Usage:  npx tsx src/scripts/gps-bg.ts
 * Or:     npm run gps:bg
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env BEFORE importing modules that use env vars
const envPath = resolve(process.cwd(), '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch {
  console.error('[GPS] Warning: could not load .env file');
}

const INTERVAL = 30_000; // 30 seconds

async function tick() {
  // Dynamic import so env vars are available when prisma client initializes
  const { runGpsPoll } = await import('../lib/gps-poller');
  const result = await runGpsPoll();
  const time = new Date().toLocaleTimeString('cs-CZ');
  if (result.tracked > 0) {
    console.log(`[${time}] GPS: ${result.tracked}/${result.total} vehicles tracked`);
  }
}

async function main() {
  console.log(`[GPS Background Poller] Started — every ${INTERVAL / 1000}s`);
  console.log(`[GPS Background Poller] Press Ctrl+C to stop\n`);

  // Run first tick
  try {
    await tick();
  } catch (err) {
    console.error('[GPS] First poll error:', err);
  }

  // Then repeat
  setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      console.error('[GPS] Polling error:', err);
    }
  }, INTERVAL);
}

main().catch((err) => {
  console.error('[GPS] Fatal error:', err);
  process.exit(1);
});
