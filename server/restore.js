const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Read backup file
const backupPath = path.join(__dirname, 'backup.json');
if (!fs.existsSync(backupPath)) {
  console.error(`❌ Backup file not found at: ${backupPath}. Please run backup first!`);
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Accept new database URL from arguments or environment
const newDbUrl = process.argv[2] || process.env.NEW_DATABASE_URL;

if (!newDbUrl) {
  console.error('❌ Please provide the new DATABASE_URL as an argument or environment variable!');
  console.log('Example: node server/restore.js "postgresql://..."');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: newDbUrl
    }
  }
});

async function main() {
  console.log('=== Starting Database Import (Restore) ===');
  console.log(`Target database: ${newDbUrl.split('@')[1] || 'New DB'}`);
  
  try {
    // 1. Clean existing tables to avoid conflicts
    console.log('Cleaning existing tables...');
    await prisma.event.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.invite.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.subTask.deleteMany({});
    await prisma.cardLabel.deleteMany({});
    await prisma.cardAssignee.deleteMany({});
    await prisma.card.deleteMany({});
    await prisma.canvasColumn.deleteMany({});
    await prisma.canvasMember.deleteMany({});
    await prisma.canvas.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Clean completed.');

    // 2. Restore in dependency order
    console.log('1. Restoring Users...');
    if (backup.users?.length) {
      await prisma.user.createMany({ data: backup.users });
      console.log(`   Restored ${backup.users.length} users.`);
    }

    console.log('2. Restoring Workspaces...');
    if (backup.workspaces?.length) {
      await prisma.workspace.createMany({ data: backup.workspaces });
      console.log(`   Restored ${backup.workspaces.length} workspaces.`);
    }

    console.log('3. Restoring Workspace Members...');
    if (backup.workspaceMembers?.length) {
      await prisma.workspaceMember.createMany({ data: backup.workspaceMembers });
      console.log(`   Restored ${backup.workspaceMembers.length} workspace members.`);
    }

    console.log('4. Restoring Canvases...');
    if (backup.canvases?.length) {
      await prisma.canvas.createMany({ data: backup.canvases });
      console.log(`   Restored ${backup.canvases.length} canvases.`);
    }

    console.log('5. Restoring Canvas Members...');
    if (backup.canvasMembers?.length) {
      await prisma.canvasMember.createMany({ data: backup.canvasMembers });
      console.log(`   Restored ${backup.canvasMembers.length} canvas members.`);
    }

    console.log('6. Restoring Columns...');
    if (backup.columns?.length) {
      await prisma.canvasColumn.createMany({ data: backup.columns });
      console.log(`   Restored ${backup.columns.length} columns.`);
    }

    console.log('7. Restoring Cards...');
    if (backup.cards?.length) {
      await prisma.card.createMany({ data: backup.cards });
      console.log(`   Restored ${backup.cards.length} cards.`);
    }

    console.log('8. Restoring Card Assignees...');
    if (backup.cardAssignees?.length) {
      await prisma.cardAssignee.createMany({ data: backup.cardAssignees });
      console.log(`   Restored ${backup.cardAssignees.length} card assignees.`);
    }

    console.log('9. Restoring Card Labels...');
    if (backup.cardLabels?.length) {
      await prisma.cardLabel.createMany({ data: backup.cardLabels });
      console.log(`   Restored ${backup.cardLabels.length} card labels.`);
    }

    console.log('10. Restoring Subtasks...');
    if (backup.subTasks?.length) {
      await prisma.subTask.createMany({ data: backup.subTasks });
      console.log(`   Restored ${backup.subTasks.length} subtasks.`);
    }

    console.log('11. Restoring Comments...');
    // Note: Comments can be nested (parent-child). We should restore root comments first, then children.
    if (backup.comments?.length) {
      const rootComments = backup.comments.filter(c => !c.parentId);
      const childComments = backup.comments.filter(c => c.parentId);
      
      if (rootComments.length) {
        await prisma.comment.createMany({ data: rootComments });
        console.log(`   Restored ${rootComments.length} root comments.`);
      }
      if (childComments.length) {
        await prisma.comment.createMany({ data: childComments });
        console.log(`   Restored ${childComments.length} child comment replies.`);
      }
    }

    console.log('12. Restoring Attachments...');
    if (backup.attachments?.length) {
      await prisma.attachment.createMany({ data: backup.attachments });
      console.log(`   Restored ${backup.attachments.length} attachments.`);
    }

    console.log('13. Restoring Invites...');
    if (backup.invites?.length) {
      await prisma.invite.createMany({ data: backup.invites });
      console.log(`   Restored ${backup.invites.length} invites.`);
    }

    console.log('14. Restoring Notifications...');
    if (backup.notifications?.length) {
      await prisma.notification.createMany({ data: backup.notifications });
      console.log(`   Restored ${backup.notifications.length} notifications.`);
    }

    console.log('15. Restoring Bookmarks...');
    if (backup.bookmarks?.length) {
      await prisma.bookmark.createMany({ data: backup.bookmarks });
      console.log(`   Restored ${backup.bookmarks.length} bookmarks.`);
    }

    console.log('16. Restoring Messages...');
    if (backup.messages?.length) {
      await prisma.message.createMany({ data: backup.messages });
      console.log(`   Restored ${backup.messages.length} messages.`);
    }

    console.log('17. Restoring Events...');
    if (backup.events?.length) {
      await prisma.event.createMany({ data: backup.events });
      console.log(`   Restored ${backup.events.length} events.`);
    }

    console.log('\n🎉 SUCCESS: All data migrated and restored successfully to the new database!');
  } catch (err) {
    console.error('❌ Restore failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
