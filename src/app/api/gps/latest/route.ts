import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAllVehiclesWithFallback, isInsideGeozone } from '@/lib/gps';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns latest GPS position for each active vehicle.
 * Also saves tracks to DB on each call (piggyback polling).
 */
export async function GET() {
  const vehicles = await prisma.vehicles.findMany({
    where: { status: 'active', vin: { not: null } },
    select: { id: true, name: true, license_plate: true, vin: true, worker: { select: { name: true } } },
  });

  if (vehicles.length === 0) {
    return NextResponse.json([]);
  }

  const vins = vehicles.filter((v) => v.vin).map((v) => v.vin!);
  const vinToVehicle = new Map(vehicles.map((v) => [v.vin!, v]));

  // Fetch live GPS data (tries "all", then per-VIN fallback)
  const liveData = await fetchAllVehiclesWithFallback(vins);

  const result: Array<{
    vehicleId: number;
    name: string;
    licensePlate: string | null;
    driver: string | null;
    lat: number;
    lng: number;
    speed: number | null;
    recordedAt: string;
    online: boolean;
  }> = [];

  const matchedVehicleIds = new Set<number>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get geozones for enter/exit detection
  const geozones = await prisma.geozones.findMany({
    include: { project: { select: { id: true, status: true } } },
  });
  const activeGeozones = geozones.filter(
    (g) => g.type !== 'project' || (g.project && g.project.status === 'active')
  );

  for (const gps of liveData) {
    const vehicle = vinToVehicle.get(gps.vin);
    if (!vehicle) continue;

    const lat = gps.lat;
    const lng = gps.lng;
    const speed = gps.speed;
    const recordedAt = gps.timestamp ? new Date(gps.timestamp) : now;

    matchedVehicleIds.add(vehicle.id);
    result.push({
      vehicleId: vehicle.id,
      name: vehicle.name,
      licensePlate: vehicle.license_plate,
      driver: vehicle.worker?.name || null,
      lat,
      lng,
      speed,
      recordedAt: recordedAt.toISOString(),
      online: true,
    });

    // --- Save track to DB (fire-and-forget, don't block response) ---
    saveTrackAndCheckGeozones(vehicle.id, lat, lng, speed, recordedAt, today, activeGeozones).catch(() => {});
  }

  // For vehicles not found in live data, check DB for last known position
  const unmatchedIds = vehicles.filter((v) => !matchedVehicleIds.has(v.id)).map((v) => v.id);

  if (unmatchedIds.length > 0) {
    const latestTracks = await prisma.$queryRawUnsafe<Array<{
      vehicle_id: number;
      lat: string;
      lng: string;
      speed: string | null;
      recorded_at: Date;
    }>>(
      `SELECT DISTINCT ON (vehicle_id) vehicle_id, lat, lng, speed, recorded_at
       FROM gps_tracks
       WHERE vehicle_id = ANY($1::int[])
       ORDER BY vehicle_id, recorded_at DESC`,
      unmatchedIds
    );

    for (const track of latestTracks) {
      const vehicle = vehicles.find((v) => v.id === track.vehicle_id);
      if (!vehicle) continue;

      const isOnline = Date.now() - new Date(track.recorded_at).getTime() < 5 * 60 * 1000;
      result.push({
        vehicleId: vehicle.id,
        name: vehicle.name,
        licensePlate: vehicle.license_plate,
        driver: vehicle.worker?.name || null,
        lat: Number(track.lat),
        lng: Number(track.lng),
        speed: track.speed ? Number(track.speed) : null,
        recordedAt: track.recorded_at.toISOString(),
        online: isOnline,
      });
    }
  }

  return NextResponse.json(result);
}

type GeoZoneRow = {
  id: number;
  type: string;
  project_id: number | null;
  lat: { toNumber?: () => number } | number;
  lng: { toNumber?: () => number } | number;
  radius_m: number;
  project: { id: number; status: string } | null;
};

async function saveTrackAndCheckGeozones(
  vehicleId: number,
  lat: number,
  lng: number,
  speed: number | null,
  recordedAt: Date,
  today: Date,
  activeGeozones: GeoZoneRow[],
) {
  // Deduplicate: skip if same location within last 20 seconds
  const lastTrack = await prisma.gps_tracks.findFirst({
    where: { vehicle_id: vehicleId },
    orderBy: { recorded_at: 'desc' },
    select: { lat: true, lng: true, recorded_at: true },
  });

  const isDuplicate = lastTrack &&
    Math.abs(Number(lastTrack.lat) - lat) < 0.00001 &&
    Math.abs(Number(lastTrack.lng) - lng) < 0.00001 &&
    (Date.now() - new Date(lastTrack.recorded_at).getTime()) < 20000;

  if (!isDuplicate) {
    await prisma.gps_tracks.create({
      data: { vehicle_id: vehicleId, lat, lng, speed, recorded_at: recordedAt },
    });
  }

  // Check geozones
  for (const zone of activeGeozones) {
    const zoneLat = typeof zone.lat === 'number' ? zone.lat : Number(zone.lat);
    const zoneLng = typeof zone.lng === 'number' ? zone.lng : Number(zone.lng);
    const inside = isInsideGeozone(lat, lng, zoneLat, zoneLng, zone.radius_m);

    const openSession = await prisma.gps_work_hours.findFirst({
      where: { vehicle_id: vehicleId, geozone_id: zone.id, work_date: today, exit_time: null },
    });

    if (inside && !openSession) {
      await prisma.gps_work_hours.create({
        data: {
          vehicle_id: vehicleId,
          geozone_id: zone.id,
          project_id: zone.project_id,
          work_date: today,
          enter_time: recordedAt,
        },
      });
    } else if (!inside && openSession) {
      const hours = (recordedAt.getTime() - new Date(openSession.enter_time).getTime()) / 3_600_000;
      await prisma.gps_work_hours.update({
        where: { id: openSession.id },
        data: { exit_time: recordedAt, hours: Math.round(hours * 100) / 100 },
      });
    }
  }
}
