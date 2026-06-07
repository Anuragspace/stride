import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for other massive base64 strings in the DB...');
  
  let count = 0;

  // Check Canvases
  const canvases = await prisma.canvas.findMany({
    select: { id: true, name: true, icon: true }
  });
  for (const c of canvases) {
    if (c.icon && c.icon.length > 100000 && c.icon.startsWith('data:image/')) {
      console.log(`Found massive canvas icon: ${c.name}`);
      await prisma.canvas.update({ where: { id: c.id }, data: { icon: null } });
      count++;
    }
  }

  console.log(`Cleanup complete. Reset ${count} extra items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
