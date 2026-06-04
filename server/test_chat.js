const axios = require('d:/Stride/node_modules/axios');
const { io } = require('d:/Stride/node_modules/socket.io-client');

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const SOCKET_BASE = 'http://127.0.0.1:3001';

async function runTest() {
  console.log('=== Starting Multi-User Workspace Group Chat Real-time Integration Test ===');

  const timestamp = Date.now();
  const testUserA = {
    name: `Tester A ${timestamp}`,
    email: `tester_a_${timestamp}@example.com`,
    password: 'securePassword123!',
  };
  const testUserB = {
    name: `Tester B ${timestamp}`,
    email: `tester_b_${timestamp}@example.com`,
    password: 'securePassword123!',
  };

  // 1. Sign up both users
  console.log('1. Signing up test users...');
  const resA = await axios.post(`${API_BASE}/auth/signup`, testUserA);
  const tokenA = resA.data.data.accessToken;

  const resB = await axios.post(`${API_BASE}/auth/signup`, testUserB);
  const tokenB = resB.data.data.accessToken;
  console.log('   Users signed up successfully. Tokens retrieved.');

  // 2. Create a Workspace (as User A)
  console.log('2. Creating a test workspace as User A...');
  const workspaceRes = await axios.post(
    `${API_BASE}/workspaces`,
    {
      name: `Workspace ${timestamp}`,
      slug: `workspace-chat-${timestamp}`,
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const workspace = workspaceRes.data.data.workspace;
  console.log(`   Workspace created: ${workspace.name} (${workspace.id})`);

  // 3. Add User B to the Workspace members via invite
  console.log('3. Onboarding User B to workspace...');
  await axios.post(
    `${API_BASE}/workspaces/${workspace.id}/invites`,
    {
      email: testUserB.email,
      role: 'member',
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  
  // Fetch invites to get the token
  const invitesRes = await axios.get(`${API_BASE}/workspaces/${workspace.id}/invites`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const invite = invitesRes.data.data.invites[0];

  // User B accepts the invite
  await axios.post(
    `${API_BASE}/auth/invite-accept`,
    { token: invite.token },
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  console.log('   User B onboarded successfully.');

  // 4. Connect Socket.io client for both users
  console.log('4. Connecting Socket.io clients...');
  const socketA = io(SOCKET_BASE, { transports: ['websocket', 'polling'], auth: { token: tokenA } });
  const socketB = io(SOCKET_BASE, { transports: ['websocket', 'polling'], auth: { token: tokenB } });

  await Promise.all([
    new Promise((r) => socketA.on('connect', r)),
    new Promise((r) => socketB.on('connect', r)),
  ]);
  console.log('   Both sockets connected successfully!');

  // 5. Join workspace room
  console.log('5. Joining workspace room...');
  socketA.emit('join:workspace', workspace.id);
  socketB.emit('join:workspace', workspace.id);
  await new Promise((r) => setTimeout(r, 500));

  // 6. Setup verification variables
  let receivedMessageNew = false;
  let receivedMessageDeleted = false;
  let receivedTypingStarted = false;
  let receivedTypingStopped = false;
  let sentMessageId = null;

  // Socket B listens to actions performed by User A
  socketB.on('message:new', (data) => {
    console.log('📬 [Socket B Received] message:new event:', data.content);
    if (data.content === 'Hello from User A!') {
      receivedMessageNew = true;
      sentMessageId = data.id;
    }
  });

  socketB.on('message:deleted', (data) => {
    console.log('📬 [Socket B Received] message:deleted event:', data.id);
    if (data.id === sentMessageId) {
      receivedMessageDeleted = true;
    }
  });

  socketB.on('chat:typing:user_started', (data) => {
    console.log('📬 [Socket B Received] typing:user_started from A:', data.userId);
    receivedTypingStarted = true;
  });

  socketB.on('chat:typing:user_stopped', (data) => {
    console.log('📬 [Socket B Received] typing:user_stopped from A:', data.userId);
    receivedTypingStopped = true;
  });

  // 7. Simulate typing and sending message (User A triggers, User B asserts)
  console.log('7. User A emits typing:start...');
  socketA.emit('chat:typing:start', { workspaceId: workspace.id });
  await new Promise((r) => setTimeout(r, 500));

  console.log('   User A emits typing:stop...');
  socketA.emit('chat:typing:stop', { workspaceId: workspace.id });
  await new Promise((r) => setTimeout(r, 500));

  console.log('   User A posts message via API...');
  const msgRes = await axios.post(
    `${API_BASE}/messages`,
    {
      workspaceId: workspace.id,
      content: 'Hello from User A!',
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const message = msgRes.data.data.message;

  await new Promise((r) => setTimeout(r, 1000));

  console.log('   User A deletes message via API...');
  await axios.delete(
    `${API_BASE}/messages/${message.id}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  await new Promise((r) => setTimeout(r, 1000));

  // 8. Cleanup and Assertions
  console.log('8. Cleaning up connections...');
  socketA.disconnect();
  socketB.disconnect();

  const allPassed = receivedMessageNew && receivedMessageDeleted && receivedTypingStarted && receivedTypingStopped;

  if (allPassed) {
    console.log('\n✅ SUCCESS: All Group Chat features and multi-user events verified successfully!');
  } else {
    console.error('\n❌ FAILURE: Missing events.');
    console.log({
      receivedMessageNew,
      receivedMessageDeleted,
      receivedTypingStarted,
      receivedTypingStopped
    });
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test execution failed:', err.message || err);
  process.exit(1);
});
