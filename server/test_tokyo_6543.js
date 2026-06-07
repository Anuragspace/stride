const { PrismaClient } = require('@prisma/client');

const testUrl = "postgresql://postgres.thetrrhkedvioajyqili:E3E0OoXyCAtacZDE@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testUrl
    }
  }
});

async function main() {
  console.log('Attempting to connect to Tokyo pooler on port 6543 (Transaction Mode)...');
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('Connection successful! Query result:', result);
  } catch (err) {
    console.error('Connection failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
