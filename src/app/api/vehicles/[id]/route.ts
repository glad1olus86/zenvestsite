import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, license_plate, vin, gps_device_id, worker_id, status } = body;

  const vehicle = await prisma.vehicles.update({
    where: { id: Number(id) },
    data: {
      ...(name != null && { name }),
      ...(license_plate !== undefined && { license_plate: license_plate || null }),
      ...(vin !== undefined && { vin: vin || null }),
      ...(gps_device_id !== undefined && { gps_device_id: gps_device_id || null }),
      ...(worker_id !== undefined && { worker_id: worker_id ? Number(worker_id) : null }),
      ...(status != null && { status }),
    },
    include: {
      worker: { select: { id: true, name: true, worker_type: true } },
    },
  });

  return NextResponse.json(vehicle);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.vehicles.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
