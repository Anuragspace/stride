const { PrismaClient } = require('@prisma/client');

const regions = ['us-east-1', 'us-east-2'];

async function testRegion(region) {
  const url = `postgresql://postgres.thetrrhkedvioajyqili:E3E0OoXyCAtacZDE@aws-0-${region}.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`;
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log(`\n✅ SUCCESS in region: ${region}`);
    console.log('Result:', result);
  } catch (err) {
    console.log(`\n❌ ERROR in region: ${region}`);
    console.log(err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  for (const region of regions) {
    console.log(`Testing ${region}...`);
    await testRegion(region);
  }
}

main();
