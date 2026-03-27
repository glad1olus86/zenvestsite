import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['bcryptjs', '@prisma/client', '@prisma/adapter-pg', 'pg'],
};

export default nextConfig;
