import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const projects = await prisma.projects.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      address: true,
      status: true,
      budget_czk: true,
      allocated_hours: true,
      start_date: true,
    },
  });
  return NextResponse.json(projects);
}
