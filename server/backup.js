const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_O0EHQU9tChag@ep-long-cherry-apbxbub3.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=1"
    }
  }
});

async function main() {
  console.log('=== Starting Database Export (Backup) ===');
  const backup = {};
  
  try {
    console.log('1. Exporting Users...');
    backup.users = await prisma.user.findMany();
    
    console.log('2. Exporting Workspaces...');
    backup.workspaces = await prisma.workspace.findMany();
    
    console.log('3. Exporting Workspace Members...');
    backup.workspaceMembers = await prisma.workspaceMember.findMany();
    
    console.log('4. Exporting Canvases...');
    backup.canvases = await prisma.canvas.findMany();
    
    console.log('5. Exporting Canvas Members...');
    backup.canvasMembers = await prisma.canvasMember.findMany();
    
    console.log('6. Exporting Columns...');
    backup.columns = await prisma.canvasColumn.findMany();
    
    console.log('7. Exporting Cards...');
    backup.cards = await prisma.card.findMany();
    
    console.log('8. Exporting Card Assignees...');
    backup.cardAssignees = await prisma.cardAssignee.findMany();
    
    console.log('9. Exporting Card Labels...');
    backup.cardLabels = await prisma.cardLabel.findMany();
    
    console.log('10. Exporting Subtasks...');
    backup.subTasks = await prisma.subTask.findMany();
    
    console.log('11. Exporting Comments...');
    backup.comments = await prisma.comment.findMany();
    
    console.log('12. Exporting Attachments...');
    backup.attachments = await prisma.attachment.findMany();
    
    console.log('13. Exporting Invites...');
    backup.invites = await prisma.invite.findMany();
    
    console.log('14. Exporting Notifications...');
    backup.notifications = await prisma.notification.findMany();
    
    console.log('15. Exporting Bookmarks...');
    backup.bookmarks = await prisma.bookmark.findMany();
    
    console.log('16. Exporting Messages...');
    backup.messages = await prisma.message.findMany();
    
    console.log('17. Exporting Events...');
    backup.events = await prisma.event.findMany();

    const backupPath = path.join(__dirname, 'backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup completed successfully! Saved to: ${backupPath}`);
    console.log('Table Counts:');
    Object.keys(backup).forEach(key => {
      console.log(`- ${key}: ${backup[key].length} records`);
    });
  } catch (err) {
    console.error('❌ Backup failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
