const { PrismaClient } = require('@prisma/client');

// Trying Tokyo region pooler
const testUrl = "postgresql://postgres.thetrrhkedvioajyqili:E3E0OoXyCAtacZDE@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testUrl
    }
  }
});

async function main() {
  console.log('Attempting to connect to Supabase Tokyo pooler on port 5432 (Session Mode)...');
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
