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

// ─── Global Error Guards ─────────────────────────────────────────────────────
// Prevent unhandled promise rejections (e.g. from fire-and-forget DB writes)
// from crashing the entire process and causing an OOM restart cycle.

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UnhandledRejection] Caught unhandled promise rejection:', reason);
  // Do NOT exit — let the server keep running
});

process.on('uncaughtException', (err: Error) => {
  console.error('[UncaughtException] Caught uncaught exception:', err.message);
  // Only exit on truly unrecoverable errors
  if (err.message.includes('EADDRINUSE')) {
    process.exit(1);
  }
});

// ─── App Setup ──────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────────

// Support multiple CLIENT_URL values (comma-separated) for CORS
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((o) => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' })); // Reduced from 10mb — no use case for 10mb JSON
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Root & Health ──────────────────────────────────────────────────────────

// Friendly response for bare domain visits (https://stride-3rqi.onrender.com)
app.get('/', (_req, res) => {
  res.json({
    data: {
      name: 'Stride API',
      version: 'v1',
      status: 'ok',
      health: '/api/v1/health',
    },
    error: null,
    meta: null,
  });
});

// /api/health alias for Render's UptimeRobot / health-check pings
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() }, error: null, meta: null });
});

app.get('/api/v1/health', (_req, res) => {
  const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  res.json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryMB: memMB,
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
