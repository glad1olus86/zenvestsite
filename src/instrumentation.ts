/**
 * Next.js Instrumentation.
 * GPS polling in production runs via PM2 (npm run gps:bg).
 * In development, run: npm run gps:bg in a separate terminal.
 */
export async function register() {
  // No-op: GPS polling handled externally to avoid
  // Prisma/Edge Runtime incompatibility with Turbopack.
}
