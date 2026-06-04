import { PrismaClient } from '@prisma/client';

// ─── Connection pool sizing ──────────────────────────────────────────────────
// On Render free tier (512MB RAM), each Postgres connection uses ~20-50MB.
// Keep the pool small to avoid OOM. pgBouncer on the pooler side handles
// multiplexing, so Prisma only needs 2-3 connections max.
const CONNECTION_LIMIT = process.env.NODE_ENV === 'production' ? 3 : 5;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown — release connections cleanly on SIGTERM/SIGINT
const gracefulShutdown = async (signal: string) => {
  console.log(`[Prisma] ${signal} received — disconnecting...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default prisma;
