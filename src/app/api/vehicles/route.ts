import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const vehicles = await prisma.vehicles.findMany({
    include: {
      worker: { select: { id: true, name: true, worker_type: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Fetch latest GPS position for each vehicle
  const vehicleIds = vehicles.map((v) => v.id);
  const latestTracks = vehicleIds.length > 0
    ? await prisma.$queryRawUnsafe<Array<{
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
        vehicleIds
      )
    : [];

  const trackMap = new Map(latestTracks.map((t) => [t.vehicle_id, t]));

  const result = vehicles.map((v) => {
    const track = trackMap.get(v.id);
    const isOnline = track
      ? Date.now() - new Date(track.recorded_at).getTime() < 5 * 60 * 1000
      : false;
    return {
      ...v,
      lastPosition: track
        ? { lat: Number(track.lat), lng: Number(track.lng), speed: track.speed ? Number(track.speed) : null, recorded_at: track.recorded_at }
        : null,
      online: isOnline,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, license_plate, vin, gps_device_id, worker_id } = body;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const vehicle = await prisma.vehicles.create({
    data: {
      name,
      license_plate: license_plate || null,
      vin: vin || null,
      gps_device_id: gps_device_id || null,
      worker_id: worker_id ? Number(worker_id) : null,
    },
    include: {
      worker: { select: { id: true, name: true, worker_type: true } },
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
