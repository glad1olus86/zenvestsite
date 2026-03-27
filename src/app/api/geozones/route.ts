import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const geozones = await prisma.geozones.findMany({
    include: {
      project: {
        select: { id: true, name: true, status: true, address: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(geozones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, project_id, lat, lng, radius_m } = body;

  if (!name || lat == null || lng == null) {
    return NextResponse.json({ error: 'name, lat, lng required' }, { status: 400 });
  }

  // project_id required only for type "project"
  const zoneType = type || 'project';
  if (zoneType === 'project' && !project_id) {
    return NextResponse.json({ error: 'project_id required for project zones' }, { status: 400 });
  }

  const geozone = await prisma.geozones.create({
    data: {
      name,
      type: zoneType,
      project_id: project_id ? Number(project_id) : null,
      lat,
      lng,
      radius_m: radius_m ?? 500,
    },
    include: {
      project: {
        select: { id: true, name: true, status: true, address: true },
      },
    },
  });

  return NextResponse.json(geozone, { status: 201 });
}
