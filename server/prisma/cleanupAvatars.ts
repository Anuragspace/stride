import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting avatar cleanup...');
  
  // Find all users with massive avatars (> 100KB)
  const users = await prisma.user.findMany({
    select: { id: true, name: true, avatarUrl: true }
  });

  let count = 0;
  for (const user of users) {
    if (user.avatarUrl && user.avatarUrl.length > 100000 && user.avatarUrl.startsWith('data:image/')) {
      console.log(`Found massive avatar for user ${user.name} (length: ${user.avatarUrl.length}). Resetting to null...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: null }
      });
      count++;
    }
  }

  console.log(`Cleanup complete. Reset ${count} avatars.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
