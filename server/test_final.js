const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('Testing final connection to Supabase...');
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ SUCCESS! Connection verified:', result);
  } catch (err) {
    console.log('❌ ERROR connection failed:');
    console.log(err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
