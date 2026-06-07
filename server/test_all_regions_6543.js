const { PrismaClient } = require('@prisma/client');

process.on('unhandledRejection', (reason) => {
  // console.log('Background rejection:', reason);
});

const regions = [
  'ap-south-1',       // Mumbai
  'ap-southeast-1',   // Singapore
  'ap-southeast-2',   // Sydney
  'ap-northeast-1',   // Tokyo
  'ap-northeast-2',   // Seoul
  'us-east-1',        // N. Virginia
  'us-east-2',        // Ohio
  'us-west-1',        // N. California
  'us-west-2',        // Oregon
  'eu-central-1',     // Frankfurt
  'eu-west-1',        // Ireland
  'eu-west-2',        // London
  'eu-west-3',        // Paris
  'ca-central-1',     // Canada
  'sa-east-1'         // Sao Paulo
];

async function testRegion(region) {
  const url = `postgresql://postgres.thetrrhkedvioajyqili:E3E0OoXyCAtacZDE@aws-0-${region}.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`;
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  
  try {
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 as connected`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);
    console.log(`✅ SUCCESS in region: ${region}`);
    return region;
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('tenant/user postgres.thetrrhkedvioajyqili not found') || msg.includes('Tenant or user not found')) {
      console.log(`❓ Region ${region}: Tenant not found`);
    } else if (msg.includes('authentication failed') || msg.includes('password')) {
      console.log(`🔑 Region ${region}: Authenticated but password error! (${msg.trim().split('\n')[0]})`);
      return region;
    } else {
      console.log(`❌ Region ${region}: ${msg.trim().split('\n')[0]}`);
    }
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('Starting Supabase region discovery on port 6543...');
  for (const region of regions) {
    console.log(`Testing region ${region}...`);
    const found = await testRegion(region);
    if (found) {
      console.log(`\n🎉 FOUND IT on port 6543! Region: ${found}`);
      break;
    }
  }
  console.log('Discovery finished.');
}

main();
