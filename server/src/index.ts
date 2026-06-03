import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketIO } from './socket';

// Route imports
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import canvasRoutes from './routes/canvases';
import cardRoutes from './routes/cards';
import commentRoutes from './routes/comments';
import eventRoutes from './routes/events';
import notificationRoutes from './routes/notifications';
import searchRoutes from './routes/search';
import userRoutes from './routes/users';

// ─── App Setup ──────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root path — friendly response for bare domain visits
app.get('/', (_req, res) => {
  res.json({
    data: {
      name: 'Stride API',
      version: 'v1',
      status: 'ok',
      docs: '/api/v1/health',
    },
    error: null,
    meta: null,
  });
});

// Also accept /api/health as an alias (Render UptimeRobot-friendly)
app.get('/api/health', (_req, res) => res.redirect('/api/v1/health'));

app.get('/api/v1/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    error: null,
    meta: null,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/canvases', canvasRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/users', userRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
    meta: null,
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────

app.use(errorHandler);

// ─── Socket.io ──────────────────────────────────────────────────────────────

setupSocketIO(server);

// ─── Start Server ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🚀 Stride Server running on port ${PORT}          ║
  ║                                                   ║
  ║   REST API:    http://localhost:${PORT}/api/v1       ║
  ║   Health:      http://localhost:${PORT}/api/v1/health║
  ║   Socket.io:   ws://localhost:${PORT}               ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export { app, server };
