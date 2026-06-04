import { PrismaClient } from '@prisma/client';

// ─── Singleton Prisma Client ─────────────────────────────────────────────────
// connection_limit=2 keeps the pool minimal for 512MB containers.
// Prisma handles reconnection internally on transient Neon errors (E57P01).

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  if (url.includes('connection_limit=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=2`;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown — release connections on SIGTERM/SIGINT
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
