import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.users.findUnique({ where: { email: 'admin@zenvest.cz' } });
  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  const hash = await bcrypt.hash('admin123', 12);
  await prisma.users.create({
    data: {
      email: 'admin@zenvest.cz',
      password_hash: hash,
      name: 'Admin',
      role: 'admin',
    },
  });
  console.log('Created admin user: admin@zenvest.cz / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
