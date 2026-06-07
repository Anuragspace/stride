const { PrismaClient } = require('@prisma/client');

// Prevent process crash from delayed background connection failures
process.on('unhandledRejection', (reason) => {
  // console.log('Suppressed background rejection:', reason.message || reason);
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
  const url = `postgresql://postgres.thetrrhkedvioajyqili:E3E0OoXyCAtacZDE@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  
  try {
    // Wait up to 10 seconds to allow a proper connection response
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 as connected`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
    console.log(`✅ Success in region: ${region}`);
    return region;
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('tenant/user postgres.thetrrhkedvioajyqili not found')) {
      console.log(`❓ Region ${region}: Tenant not found`);
    } else if (msg.includes('authentication failed') || msg.includes('password')) {
      console.log(`🔑 Region ${region}: Authenticated but password error! (${msg.trim()})`);
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
  console.log('Starting Supabase region auto-discovery...');
  for (const region of regions) {
    console.log(`\n--- Testing region: ${region} ---`);
    const found = await testRegion(region);
    if (found) {
      console.log(`\n🎉 FOUND IT! The correct connection URL is using region: ${found}`);
      break;
    }
  }
  console.log('\nDiscovery finished.');
}

main();
