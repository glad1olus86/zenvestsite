import { prisma } from './prisma';
import { fetchAllVehiclesWithFallback, isInsideGeozone } from './gps';

/**
 * Core GPS polling logic.
 * 1. Fetch GPS positions for all active vehicles
 * 2. Save each point to gps_tracks
 * 3. Check geozones — enter/exit events → gps_work_hours
 *
 * Used by: instrumentation.ts (background interval) + /api/gps/poll (manual trigger)
 */
export async function runGpsPoll(): Promise<{ tracked: number; total: number }> {
  // Get our vehicles with VINs
  const vehicles = await prisma.vehicles.findMany({
    where: { vin: { not: null }, status: 'active' },
  });
  const vins = vehicles.filter((v) => v.vin).map((v) => v.vin!);
  const vinMap = new Map(vehicles.map((v) => [v.vin!, v]));

  if (vins.length === 0) {
    return { tracked: 0, total: 0 };
  }

  // Fetch GPS data (tries "all", then per-VIN fallback)
  const gpsData = await fetchAllVehiclesWithFallback(vins);
  if (gpsData.length === 0) {
    return { tracked: 0, total: 0 };
  }

  // Get all geozones
  const geozones = await prisma.geozones.findMany({
    include: { project: { select: { id: true, status: true } } },
  });
  const activeGeozones = geozones.filter(
    (g) => g.type !== 'project' || (g.project && g.project.status === 'active')
  );

  let tracked = 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const gpsVehicle of gpsData) {
    const vehicle = vinMap.get(gpsVehicle.vin);
    if (!vehicle) continue;

    const lat = Number(gpsVehicle.lat);
    const lng = Number(gpsVehicle.lng);
    const speed = gpsVehicle.speed != null ? Number(gpsVehicle.speed) : null;
    const recordedAt = gpsVehicle.timestamp ? new Date(gpsVehicle.timestamp) : now;

    if (isNaN(lat) || isNaN(lng)) continue;

    // Skip duplicate points: check if last saved point is same location
    const lastTrack = await prisma.gps_tracks.findFirst({
      where: { vehicle_id: vehicle.id },
      orderBy: { recorded_at: 'desc' },
      select: { lat: true, lng: true, recorded_at: true },
    });

    const isDuplicate = lastTrack &&
      Math.abs(Number(lastTrack.lat) - lat) < 0.000001 &&
      Math.abs(Number(lastTrack.lng) - lng) < 0.000001 &&
      (now.getTime() - new Date(lastTrack.recorded_at).getTime()) < 60000; // same point within 1 min

    // Save GPS track point (skip only exact duplicates within 1 minute)
    if (!isDuplicate) {
      await prisma.gps_tracks.create({
        data: {
          vehicle_id: vehicle.id,
          lat,
          lng,
          speed,
          recorded_at: recordedAt,
        },
      });
    }

    // Check each geozone for enter/exit
    for (const zone of activeGeozones) {
      const inside = isInsideGeozone(
        lat, lng,
        Number(zone.lat), Number(zone.lng), zone.radius_m
      );

      const openSession = await prisma.gps_work_hours.findFirst({
        where: {
          vehicle_id: vehicle.id,
          geozone_id: zone.id,
          work_date: today,
          exit_time: null,
        },
      });

      if (inside && !openSession) {
        // ENTER zone
        await prisma.gps_work_hours.create({
          data: {
            vehicle_id: vehicle.id,
            geozone_id: zone.id,
            project_id: zone.project_id,
            work_date: today,
            enter_time: recordedAt,
          },
        });
      } else if (!inside && openSession) {
        // EXIT zone — calculate hours
        const enterTime = new Date(openSession.enter_time);
        const hours = (recordedAt.getTime() - enterTime.getTime()) / (1000 * 60 * 60);

        await prisma.gps_work_hours.update({
          where: { id: openSession.id },
          data: {
            exit_time: recordedAt,
            hours: Math.round(hours * 100) / 100,
          },
        });
      }
    }

    tracked++;
  }

  return { tracked, total: gpsData.length };
}
