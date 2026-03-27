import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAllVehicles, fetchVehicleByVin, fetchAllVehiclesWithFallback } from '@/lib/gps';

/**
 * Debug endpoint to test GPS API connection.
 * GET /api/gps/debug — full diagnostics
 */
export async function GET() {
  const config = {
    ROYFIS_API_URL: process.env.ROYFIS_API_URL || 'NOT SET',
    ROYFIS_BEARER_TOKEN: process.env.ROYFIS_BEARER_TOKEN ? 'SET (hidden)' : 'NOT SET',
    ROYFIS_USER_UI: process.env.ROYFIS_USER_UI || 'NOT SET',
  };

  // Our vehicles from DB
  const ourVehicles = await prisma.vehicles.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, vin: true, license_plate: true },
  });

  // Test "all vehicles" endpoint
  const allResult = await fetchAllVehicles();

  // Test per-VIN for each of our vehicles
  const vinResults: Record<string, unknown> = {};
  for (const v of ourVehicles) {
    if (v.vin) {
      const gpsData = await fetchVehicleByVin(v.vin);
      vinResults[v.vin] = gpsData || 'null (no GPS data)';
    }
  }

  // Test the full fallback pipeline (what /api/gps/latest uses)
  const vins = ourVehicles.filter((v) => v.vin).map((v) => v.vin!);
  const fallbackResult = await fetchAllVehiclesWithFallback(vins);

  return NextResponse.json({
    config,
    ourVehicles,
    allEndpoint: allResult.length > 0 ? allResult : 'Empty or 500 (normal if royfis "all" endpoint not working)',
    perVinResults: vinResults,
    fallbackPipeline: fallbackResult.length > 0 ? fallbackResult : 'No live GPS data',
    summary: {
      vehiclesInDB: ourVehicles.length,
      vehiclesWithVIN: ourVehicles.filter((v) => v.vin).length,
      liveGPSPositions: fallbackResult.length,
    },
  }, { status: 200 });
}
