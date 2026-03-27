/**
 * Next.js Instrumentation — runs once on server startup.
 * Starts background GPS polling interval (every 30 seconds).
 */
export async function register() {
  // Only run on the server (not during build or in edge runtime)
  if (typeof globalThis.setInterval === 'undefined') return;

  // Avoid duplicate intervals in development (hot reload)
  const global = globalThis as unknown as { __gpsPollingStarted?: boolean };
  if (global.__gpsPollingStarted) return;
  global.__gpsPollingStarted = true;

  const GPS_POLL_INTERVAL = 30_000; // 30 seconds

  console.log(`[GPS] Background polling started (every ${GPS_POLL_INTERVAL / 1000}s)`);

  // Start polling after a short delay to let the server fully initialize
  setTimeout(() => {
    // Run immediately on startup
    pollGps();

    // Then repeat every 30 seconds
    setInterval(pollGps, GPS_POLL_INTERVAL);
  }, 5000);
}

async function pollGps() {
  try {
    const { runGpsPoll } = await import('./lib/gps-poller');
    const result = await runGpsPoll();

    if (result.tracked > 0) {
      console.log(`[GPS] Polled: ${result.tracked}/${result.total} vehicles tracked`);
    }
  } catch (err) {
    console.error('[GPS] Polling error:', err);
  }
}
