import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, type, lat, lng, radius_m, project_id } = body;

  const geozone = await prisma.geozones.update({
    where: { id: Number(id) },
    data: {
      ...(name != null && { name }),
      ...(type != null && { type }),
      ...(lat != null && { lat }),
      ...(lng != null && { lng }),
      ...(radius_m != null && { radius_m }),
      ...(project_id !== undefined && { project_id: project_id ? Number(project_id) : null }),
    },
    include: {
      project: {
        select: { id: true, name: true, status: true, address: true },
      },
    },
  });

  return NextResponse.json(geozone);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.geozones.delete({ where: { id: Number(id) } });

  return NextResponse.json({ ok: true });
}
