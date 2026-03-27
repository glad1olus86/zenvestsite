import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const workers = await prisma.workers.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, worker_type: true, hourly_rate: true },
  });
  return NextResponse.json(workers);
}
