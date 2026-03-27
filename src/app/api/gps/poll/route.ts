import { NextResponse } from 'next/server';
import { runGpsPoll } from '@/lib/gps-poller';

/**
 * Manual GPS polling trigger.
 * Also called automatically by instrumentation.ts every 30 seconds.
 */
export async function GET() {
  try {
    const result = await runGpsPoll();

    if (result.tracked === 0 && result.total === 0) {
      return NextResponse.json({ status: 'no_data', ...result });
    }

    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    console.error('GPS poll error:', error);
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 500 }
    );
  }
}
