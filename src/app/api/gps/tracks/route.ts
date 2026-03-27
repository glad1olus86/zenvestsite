import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VEHICLE_COLORS = [
  '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];

/**
 * GET /api/gps/tracks?date=2026-03-26&vehicle_id=1
 *
 * Returns tracks grouped by vehicle for a given date.
 * Includes geozone sessions with enter/exit coordinates for route segmentation.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateStr = searchParams.get('date');
  const vehicleIdStr = searchParams.get('vehicle_id');

  if (!dateStr) {
    return NextResponse.json({ error: 'date parameter required (YYYY-MM-DD)' }, { status: 400 });
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const vehicleWhere = vehicleIdStr
    ? { id: Number(vehicleIdStr), status: 'active' as const }
    : { status: 'active' as const, vin: { not: null } };

  const vehicles = await prisma.vehicles.findMany({
    where: vehicleWhere,
    select: { id: true, name: true, license_plate: true },
  });

  if (vehicles.length === 0) {
    return NextResponse.json([]);
  }

  const vehicleIds = vehicles.map((v) => v.id);

  // Get all tracks for the date
  const tracks = await prisma.gps_tracks.findMany({
    where: {
      vehicle_id: { in: vehicleIds },
      recorded_at: { gte: startOfDay, lt: endOfDay },
    },
    orderBy: { recorded_at: 'asc' },
    select: {
      vehicle_id: true,
      lat: true,
      lng: true,
      speed: true,
      recorded_at: true,
    },
  });

  // Get geozone sessions for the date
  const workHours = await prisma.gps_work_hours.findMany({
    where: {
      vehicle_id: { in: vehicleIds },
      work_date: startOfDay,
    },
    include: {
      geozone: { select: { id: true, name: true, type: true, lat: true, lng: true, radius_m: true } },
      project: { select: { name: true } },
    },
    orderBy: { enter_time: 'asc' },
  });

  // Group by vehicle
  const result = vehicles.map((vehicle, idx) => {
    const vehicleTracks = tracks.filter((t) => t.vehicle_id === vehicle.id);
    const vehicleWorkHours = workHours.filter((w) => w.vehicle_id === vehicle.id);

    // Calculate total distance (only between-geozone segments)
    let totalDistanceKm = 0;
    for (let i = 1; i < vehicleTracks.length; i++) {
      const prev = vehicleTracks[i - 1];
      const curr = vehicleTracks[i];
      totalDistanceKm += haversineKm(
        Number(prev.lat), Number(prev.lng),
        Number(curr.lat), Number(curr.lng)
      );
    }

    const totalGeoHours = vehicleWorkHours.reduce(
      (sum, wh) => sum + (wh.hours ? Number(wh.hours) : 0), 0
    );

    // Build geozone sessions with enter/exit on geozone BOUNDARY (not raw GPS points)
    const geozoneSessions = vehicleWorkHours.map((wh) => {
      const enterTime = wh.enter_time.getTime();
      const exitTime = wh.exit_time?.getTime();

      const enterPoint = findClosestPoint(vehicleTracks, enterTime);
      const exitPoint = exitTime ? findClosestPoint(vehicleTracks, exitTime) : null;

      const hasGeozone = wh.geozone != null;
      const centerLat = hasGeozone ? Number(wh.geozone!.lat) : null;
      const centerLng = hasGeozone ? Number(wh.geozone!.lng) : null;
      const radiusM = hasGeozone ? wh.geozone!.radius_m : null;

      // Project enter/exit points onto the geozone circle boundary
      let enterLat: number | null = null;
      let enterLng: number | null = null;
      let exitLat: number | null = null;
      let exitLng: number | null = null;

      if (enterPoint && centerLat != null && centerLng != null && radiusM != null) {
        const bp = boundaryPoint(Number(enterPoint.lat), Number(enterPoint.lng), centerLat, centerLng, radiusM);
        enterLat = bp.lat;
        enterLng = bp.lng;
      } else if (centerLat != null && centerLng != null) {
        enterLat = centerLat;
        enterLng = centerLng;
      }

      if (exitPoint && centerLat != null && centerLng != null && radiusM != null) {
        const bp = boundaryPoint(Number(exitPoint.lat), Number(exitPoint.lng), centerLat, centerLng, radiusM);
        exitLat = bp.lat;
        exitLng = bp.lng;
      }

      return {
        geozoneId: wh.geozone?.id || null,
        geozone: wh.geozone?.name || wh.project?.name || 'Unknown',
        type: wh.geozone?.type || 'project',
        enterTime: wh.enter_time.toISOString(),
        exitTime: wh.exit_time?.toISOString() || null,
        hours: wh.hours ? Number(wh.hours) : null,
        enterLat,
        enterLng,
        exitLat,
        exitLng,
      };
    });

    return {
      vehicleId: vehicle.id,
      name: vehicle.name,
      licensePlate: vehicle.license_plate,
      color: VEHICLE_COLORS[idx % VEHICLE_COLORS.length],
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalGeoHours: Math.round(totalGeoHours * 100) / 100,
      points: vehicleTracks.map((t) => ({
        lat: Number(t.lat),
        lng: Number(t.lng),
        speed: t.speed ? Number(t.speed) : 0,
        recordedAt: t.recorded_at.toISOString(),
      })),
      geozoneSessions,
    };
  });

  return NextResponse.json(result.filter((r) => r.points.length > 0));
}

/**
 * Project a GPS point onto the boundary of a geozone circle.
 * Returns the point on the circle edge in the direction from center to the GPS point.
 */
function boundaryPoint(
  pointLat: number, pointLng: number,
  centerLat: number, centerLng: number,
  radiusM: number,
): { lat: number; lng: number } {
  const cosLat = Math.cos(centerLat * Math.PI / 180);
  const dLat = pointLat - centerLat;
  const dLng = (pointLng - centerLng) * cosLat;

  const angle = Math.atan2(dLng, dLat);
  const metersPerDeg = 111320;

  return {
    lat: centerLat + (radiusM / metersPerDeg) * Math.cos(angle),
    lng: centerLng + (radiusM / metersPerDeg) * Math.sin(angle) / cosLat,
  };
}

function findClosestPoint(
  tracks: Array<{ lat: unknown; lng: unknown; recorded_at: Date }>,
  targetTime: number
) {
  let closest = null;
  let minDiff = Infinity;
  for (const t of tracks) {
    const diff = Math.abs(t.recorded_at.getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = t;
    }
  }
  return closest;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
