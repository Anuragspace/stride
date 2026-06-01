import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Clean existing data ─────────────────────────────────────────────────

  await prisma.bookmark.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.cardLabel.deleteMany();
  await prisma.cardAssignee.deleteMany();
  await prisma.card.deleteMany();
  await prisma.canvasColumn.deleteMany();
  await prisma.canvasMember.deleteMany();
  await prisma.canvas.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✓ Cleaned existing data');

  // ─── Create Users ────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('password123', 12);

  const anurag = await prisma.user.create({
    data: {
      name: 'Anurag',
      email: 'anurag@stride.dev',
      passwordHash,
      emailVerified: true,
      avatarUrl: null,
    },
  });

  const narayan = await prisma.user.create({
    data: {
      name: 'Narayan',
      email: 'narayan@stride.dev',
      passwordHash,
      emailVerified: true,
      avatarUrl: null,
    },
  });

  const kamal = await prisma.user.create({
    data: {
      name: 'Kamal',
      email: 'kamal@stride.dev',
      passwordHash,
      emailVerified: true,
      avatarUrl: null,
    },
  });

  const sarthak = await prisma.user.create({
    data: {
      name: 'Sarthak',
      email: 'sarthak@stride.dev',
      passwordHash,
      emailVerified: true,
      avatarUrl: null,
    },
  });

  console.log('  ✓ Created 4 users: Anurag (admin), Narayan (manager), Kamal (member), Sarthak (member)');

  // ─── Create Workspace ────────────────────────────────────────────────────

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Stride Team',
      slug: 'stride-team',
      description: 'The main workspace for the Stride project management tool team.',
    },
  });

  // Add members with different roles
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: anurag.id, role: 'admin' },
      { workspaceId: workspace.id, userId: narayan.id, role: 'manager' },
      { workspaceId: workspace.id, userId: kamal.id, role: 'member' },
      { workspaceId: workspace.id, userId: sarthak.id, role: 'member' },
    ],
  });

  console.log('  ✓ Created workspace "Stride Team" with 4 members');

  // ─── Create Canvases ─────────────────────────────────────────────────────

  const productCanvas = await prisma.canvas.create({
    data: {
      name: 'Product Launch v2.0',
      description: 'Planning and tracking for the v2.0 product launch including all feature development, design, and marketing tasks.',
      workspaceId: workspace.id,
    },
  });

  const designCanvas = await prisma.canvas.create({
    data: {
      name: 'Design System',
      description: 'Building and maintaining the Stride design system components, tokens, and documentation.',
      workspaceId: workspace.id,
    },
  });

  console.log('  ✓ Created 2 canvases: "Product Launch v2.0" and "Design System"');

  // ─── Add Canvas Members ──────────────────────────────────────────────────

  await prisma.canvasMember.createMany({
    data: [
      { canvasId: productCanvas.id, userId: anurag.id, role: 'admin' },
      { canvasId: productCanvas.id, userId: narayan.id, role: 'editor' },
      { canvasId: productCanvas.id, userId: kamal.id, role: 'editor' },
      { canvasId: productCanvas.id, userId: sarthak.id, role: 'viewer' },
      { canvasId: designCanvas.id, userId: anurag.id, role: 'admin' },
      { canvasId: designCanvas.id, userId: narayan.id, role: 'editor' },
      { canvasId: designCanvas.id, userId: sarthak.id, role: 'editor' },
    ],
  });

  // ─── Create Columns for Product Canvas ────────────────────────────────────

  const pNotStarted = await prisma.canvasColumn.create({
    data: { canvasId: productCanvas.id, name: 'Not Started', position: 0, color: '#6B7280' },
  });
  const pInProgress = await prisma.canvasColumn.create({
    data: { canvasId: productCanvas.id, name: 'In Progress', position: 1, color: '#3B82F6' },
  });
  const pOnHold = await prisma.canvasColumn.create({
    data: { canvasId: productCanvas.id, name: 'On Hold', position: 2, color: '#F59E0B' },
  });
  const pDone = await prisma.canvasColumn.create({
    data: { canvasId: productCanvas.id, name: 'Done', position: 3, color: '#10B981' },
  });

  // ─── Create Columns for Design Canvas ────────────────────────────────────

  const dNotStarted = await prisma.canvasColumn.create({
    data: { canvasId: designCanvas.id, name: 'Not Started', position: 0, color: '#6B7280' },
  });
  const dInProgress = await prisma.canvasColumn.create({
    data: { canvasId: designCanvas.id, name: 'In Progress', position: 1, color: '#3B82F6' },
  });
  const dOnHold = await prisma.canvasColumn.create({
    data: { canvasId: designCanvas.id, name: 'On Hold', position: 2, color: '#F59E0B' },
  });
  const dDone = await prisma.canvasColumn.create({
    data: { canvasId: designCanvas.id, name: 'Done', position: 3, color: '#10B981' },
  });

  console.log('  ✓ Created default columns for both canvases');

  // ─── Create Cards for Product Launch Canvas ───────────────────────────────

  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // Not Started cards
  const card1 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pNotStarted.id,
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment. Include linting, unit tests, and staging deploy.',
      type: 'task',
      priority: 'high',
      position: 0,
      dueDate: inDays(14),
    },
  });

  const card2 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pNotStarted.id,
      title: 'Write API documentation',
      description: 'Document all REST API endpoints using OpenAPI/Swagger specification. Include request/response examples.',
      type: 'task',
      priority: 'medium',
      position: 1,
      dueDate: inDays(21),
    },
  });

  const card3 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pNotStarted.id,
      title: 'Performance audit',
      description: 'Run Lighthouse and bundle analysis. Optimize initial load time to under 2 seconds.',
      type: 'task',
      priority: 'low',
      position: 2,
      dueDate: inDays(30),
    },
  });

  // In Progress cards
  const card4 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pInProgress.id,
      title: 'Implement real-time notifications',
      description: 'Add Socket.io based real-time notifications for card assignments, comments, and status changes.',
      type: 'feature',
      priority: 'urgent',
      position: 0,
      dueDate: inDays(5),
    },
  });

  const card5 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pInProgress.id,
      title: 'Fix drag-and-drop reordering bug',
      description: 'Cards sometimes jump to wrong position when dragged between columns. Investigate race condition in position calculation.',
      type: 'bug',
      priority: 'high',
      position: 1,
      dueDate: inDays(3),
    },
  });

  const card6 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pInProgress.id,
      title: 'User authentication flow',
      description: 'Complete signup, login, password reset, and email verification flows. Implement JWT with refresh tokens.',
      type: 'feature',
      priority: 'high',
      position: 2,
      dueDate: inDays(7),
    },
  });

  // On Hold cards
  const card7 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pOnHold.id,
      title: 'Dark mode implementation',
      description: 'Add dark mode theme support using CSS custom properties. Include toggle in user preferences.',
      type: 'feature',
      priority: 'low',
      position: 0,
      dueDate: inDays(45),
    },
  });

  const card8 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pOnHold.id,
      title: 'Mobile responsive layout',
      description: 'Adapt the kanban board and card views for mobile devices. Consider touch-friendly drag-and-drop.',
      type: 'story',
      priority: 'medium',
      position: 1,
      dueDate: inDays(60),
    },
  });

  // Done cards
  const card9 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pDone.id,
      title: 'Database schema design',
      description: 'Design and implement the complete database schema with Prisma. Include all 14 tables with proper relations.',
      type: 'task',
      priority: 'urgent',
      position: 0,
      completed: true,
      completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  const card10 = await prisma.card.create({
    data: {
      canvasId: productCanvas.id,
      columnId: pDone.id,
      title: 'Project scaffolding',
      description: 'Set up the monorepo structure with client (React + Vite) and server (Express + TypeScript). Configure ESLint, Prettier, and TypeScript.',
      type: 'task',
      priority: 'high',
      position: 1,
      completed: true,
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // ─── Create Cards for Design System Canvas ────────────────────────────────

  const card11 = await prisma.card.create({
    data: {
      canvasId: designCanvas.id,
      columnId: dNotStarted.id,
      title: 'Create icon library',
      description: 'Compile and optimize SVG icons for the design system. Include both outlined and filled variants.',
      type: 'task',
      priority: 'medium',
      position: 0,
      dueDate: inDays(20),
    },
  });

  const card12 = await prisma.card.create({
    data: {
      canvasId: designCanvas.id,
      columnId: dInProgress.id,
      title: 'Button component variants',
      description: 'Build primary, secondary, outline, ghost, and destructive button variants with size options (sm, md, lg).',
      type: 'feature',
      priority: 'high',
      position: 0,
      dueDate: inDays(4),
    },
  });

  const card13 = await prisma.card.create({
    data: {
      canvasId: designCanvas.id,
      columnId: dInProgress.id,
      title: 'Color token system',
      description: 'Define semantic color tokens for background, foreground, border, and accent colors. Support light and dark themes.',
      type: 'task',
      priority: 'urgent',
      position: 1,
      dueDate: inDays(2),
    },
  });

  const card14 = await prisma.card.create({
    data: {
      canvasId: designCanvas.id,
      columnId: dDone.id,
      title: 'Typography scale',
      description: 'Define the type scale with font sizes, line heights, and font weights. Include display, heading, body, and caption styles.',
      type: 'task',
      priority: 'high',
      position: 0,
      completed: true,
      completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const card15 = await prisma.card.create({
    data: {
      canvasId: designCanvas.id,
      columnId: dOnHold.id,
      title: 'Animation guidelines',
      description: 'Document animation principles, timing functions, and standard transition durations for the design system.',
      type: 'story',
      priority: 'low',
      position: 0,
      dueDate: inDays(40),
    },
  });

  console.log('  ✓ Created 15 sample cards across both canvases');

  // ─── Assign Users to Cards ────────────────────────────────────────────────

  await prisma.cardAssignee.createMany({
    data: [
      { cardId: card1.id, userId: kamal.id },
      { cardId: card2.id, userId: sarthak.id },
      { cardId: card3.id, userId: narayan.id },
      { cardId: card4.id, userId: anurag.id },
      { cardId: card4.id, userId: kamal.id },
      { cardId: card5.id, userId: kamal.id },
      { cardId: card6.id, userId: anurag.id },
      { cardId: card7.id, userId: sarthak.id },
      { cardId: card8.id, userId: narayan.id },
      { cardId: card8.id, userId: sarthak.id },
      { cardId: card9.id, userId: anurag.id },
      { cardId: card10.id, userId: anurag.id },
      { cardId: card10.id, userId: narayan.id },
      { cardId: card11.id, userId: sarthak.id },
      { cardId: card12.id, userId: narayan.id },
      { cardId: card13.id, userId: narayan.id },
      { cardId: card13.id, userId: sarthak.id },
      { cardId: card14.id, userId: narayan.id },
      { cardId: card15.id, userId: sarthak.id },
    ],
  });

  console.log('  ✓ Assigned users to cards');

  // ─── Add Labels ──────────────────────────────────────────────────────────

  await prisma.cardLabel.createMany({
    data: [
      { cardId: card1.id, name: 'devops', color: '#8B5CF6' },
      { cardId: card1.id, name: 'infrastructure', color: '#EC4899' },
      { cardId: card2.id, name: 'documentation', color: '#06B6D4' },
      { cardId: card4.id, name: 'backend', color: '#F97316' },
      { cardId: card4.id, name: 'websocket', color: '#8B5CF6' },
      { cardId: card5.id, name: 'frontend', color: '#3B82F6' },
      { cardId: card5.id, name: 'critical', color: '#EF4444' },
      { cardId: card6.id, name: 'backend', color: '#F97316' },
      { cardId: card6.id, name: 'security', color: '#EF4444' },
      { cardId: card7.id, name: 'frontend', color: '#3B82F6' },
      { cardId: card7.id, name: 'design', color: '#EC4899' },
      { cardId: card8.id, name: 'frontend', color: '#3B82F6' },
      { cardId: card8.id, name: 'ux', color: '#EC4899' },
      { cardId: card9.id, name: 'backend', color: '#F97316' },
      { cardId: card9.id, name: 'database', color: '#10B981' },
      { cardId: card11.id, name: 'design', color: '#EC4899' },
      { cardId: card12.id, name: 'component', color: '#3B82F6' },
      { cardId: card13.id, name: 'design-tokens', color: '#8B5CF6' },
      { cardId: card14.id, name: 'typography', color: '#F59E0B' },
    ],
  });

  console.log('  ✓ Added labels to cards');

  // ─── Add Sub-tasks ────────────────────────────────────────────────────────

  await prisma.subTask.createMany({
    data: [
      { cardId: card4.id, title: 'Set up Socket.io server', completed: true, position: 0 },
      { cardId: card4.id, title: 'Create event types and handlers', completed: true, position: 1 },
      { cardId: card4.id, title: 'Implement client-side listener', completed: false, position: 2 },
      { cardId: card4.id, title: 'Add notification toast UI', completed: false, position: 3 },
      { cardId: card6.id, title: 'Signup endpoint', completed: true, position: 0 },
      { cardId: card6.id, title: 'Login endpoint', completed: true, position: 1 },
      { cardId: card6.id, title: 'JWT middleware', completed: true, position: 2 },
      { cardId: card6.id, title: 'Refresh token rotation', completed: false, position: 3 },
      { cardId: card6.id, title: 'Email verification', completed: false, position: 4 },
      { cardId: card12.id, title: 'Primary button', completed: true, position: 0 },
      { cardId: card12.id, title: 'Secondary button', completed: true, position: 1 },
      { cardId: card12.id, title: 'Ghost button', completed: false, position: 2 },
      { cardId: card12.id, title: 'Destructive button', completed: false, position: 3 },
      { cardId: card12.id, title: 'Size variants', completed: false, position: 4 },
    ],
  });

  console.log('  ✓ Added sub-tasks');

  // ─── Add Comments ────────────────────────────────────────────────────────

  const comment1 = await prisma.comment.create({
    data: {
      cardId: card4.id,
      userId: anurag.id,
      content: 'I\'ve started working on the Socket.io integration. The server setup is done and events are flowing properly. Need to coordinate with the frontend team on the client-side listener implementation.',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card4.id,
      userId: kamal.id,
      parentId: comment1.id,
      content: 'Great progress! I can pick up the client-side listener part. What event format are we using?',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card4.id,
      userId: anurag.id,
      parentId: comment1.id,
      content: 'Using typed events with the format { type, actorId, metadata }. I\'ll share the type definitions in the shared package.',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card5.id,
      userId: kamal.id,
      content: 'I can reproduce this consistently. The issue happens when you drag a card from column 1 to column 3, skipping column 2. The position index gets calculated based on the source column instead of the target.',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card5.id,
      userId: narayan.id,
      content: 'Good catch! This might be related to the optimistic UI update happening before the server confirms the new position. Let\'s add a debounce and server-side position validation.',
    },
  });

  const comment6 = await prisma.comment.create({
    data: {
      cardId: card6.id,
      userId: anurag.id,
      content: 'Signup and login are working. Moving on to the JWT middleware and refresh token rotation. Should we use httpOnly cookies for the refresh token?',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card6.id,
      userId: narayan.id,
      parentId: comment6.id,
      content: 'Yes, httpOnly cookies for refresh tokens is the way to go for security. Access token can be in the Authorization header.',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card9.id,
      userId: anurag.id,
      content: 'Schema design is finalized with 14 tables. All relations are set up with proper cascading deletes. The Prisma migration ran successfully.',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card13.id,
      userId: narayan.id,
      content: 'I\'m defining the color tokens using CSS custom properties. We\'ll have semantic names like --color-bg-primary, --color-text-primary, etc. This will make theme switching trivial.',
    },
  });

  await prisma.comment.create({
    data: {
      cardId: card13.id,
      userId: sarthak.id,
      content: 'Love this approach! Can we also include opacity variants? Like --color-bg-primary/50 for hover states?',
    },
  });

  console.log('  ✓ Added sample comments with threads');

  // ─── Add Events ──────────────────────────────────────────────────────────

  const eventData = [
    {
      type: 'card.created',
      actorId: anurag.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      cardId: card4.id,
      metadata: JSON.stringify({ title: card4.title, columnName: 'In Progress' }),
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'card.assigned',
      actorId: anurag.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      cardId: card4.id,
      metadata: JSON.stringify({ assigneeName: 'Kamal' }),
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'comment.added',
      actorId: anurag.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      cardId: card4.id,
      metadata: JSON.stringify({ preview: 'I\'ve started working on the Socket.io integration...' }),
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'card.completed',
      actorId: anurag.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      cardId: card9.id,
      metadata: JSON.stringify({ title: card9.title }),
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'card.completed',
      actorId: anurag.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      cardId: card10.id,
      metadata: JSON.stringify({ title: card10.title }),
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'canvas.created',
      actorId: anurag.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      metadata: JSON.stringify({ canvasName: 'Product Launch v2.0' }),
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'canvas.created',
      actorId: narayan.id,
      workspaceId: workspace.id,
      canvasId: designCanvas.id,
      metadata: JSON.stringify({ canvasName: 'Design System' }),
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'member.joined',
      actorId: anurag.id,
      workspaceId: workspace.id,
      metadata: JSON.stringify({ userName: 'Kamal' }),
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'member.joined',
      actorId: anurag.id,
      workspaceId: workspace.id,
      metadata: JSON.stringify({ userName: 'Sarthak' }),
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'card.status_changed',
      actorId: kamal.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      cardId: card5.id,
      metadata: JSON.stringify({ oldStatus: 'Not Started', newStatus: 'In Progress' }),
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'card.priority_changed',
      actorId: narayan.id,
      workspaceId: workspace.id,
      canvasId: productCanvas.id,
      cardId: card5.id,
      metadata: JSON.stringify({ oldPriority: 'medium', newPriority: 'high' }),
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'card.created',
      actorId: narayan.id,
      workspaceId: workspace.id,
      canvasId: designCanvas.id,
      cardId: card12.id,
      metadata: JSON.stringify({ title: card12.title, columnName: 'In Progress' }),
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'card.completed',
      actorId: narayan.id,
      workspaceId: workspace.id,
      canvasId: designCanvas.id,
      cardId: card14.id,
      metadata: JSON.stringify({ title: card14.title }),
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const event of eventData) {
    await prisma.event.create({ data: event });
  }

  console.log('  ✓ Added 13 sample events');

  // ─── Add Notifications ───────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        userId: kamal.id,
        type: 'card.assigned',
        title: 'Assigned to card',
        message: 'You have been assigned to "Implement real-time notifications"',
        metadata: JSON.stringify({ cardId: card4.id }),
        read: true,
      },
      {
        userId: kamal.id,
        type: 'comment.added',
        title: 'New comment',
        message: 'Anurag commented on "Implement real-time notifications"',
        metadata: JSON.stringify({ cardId: card4.id }),
        read: false,
      },
      {
        userId: sarthak.id,
        type: 'card.assigned',
        title: 'Assigned to card',
        message: 'You have been assigned to "Write API documentation"',
        metadata: JSON.stringify({ cardId: card2.id }),
        read: false,
      },
      {
        userId: narayan.id,
        type: 'card.assigned',
        title: 'Assigned to card',
        message: 'You have been assigned to "Performance audit"',
        metadata: JSON.stringify({ cardId: card3.id }),
        read: true,
      },
    ],
  });

  console.log('  ✓ Added sample notifications');

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log('\n✅ Database seeded successfully!\n');
  console.log('  Demo accounts (password: password123):');
  console.log('    • anurag@stride.dev  (admin)');
  console.log('    • narayan@stride.dev (manager)');
  console.log('    • kamal@stride.dev   (member)');
  console.log('    • sarthak@stride.dev (member)\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
