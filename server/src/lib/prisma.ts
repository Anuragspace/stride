import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// ─── Neon WebSocket Config ───────────────────────────────────────────────────
// Required for compatibility in Node.js environments when using the serverless driver.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

const isNeon = process.env.DATABASE_URL?.includes('neon.tech');

if (isNeon) {
  // Use Neon serverless driver adapter (replaces heavy native Rust query engine with WASM)
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 3 : 5
  });
  const adapter = new PrismaNeon(pool);
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
} else {
  // Fallback to standard Prisma client for local development / non-Neon DBs
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? prismaInstance;

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
