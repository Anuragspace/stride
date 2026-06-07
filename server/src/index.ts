import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
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
import messageRoutes from './routes/messages';

// ─── Global Error Guards ─────────────────────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UnhandledRejection]', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[UncaughtException]', err.message);
  if (err.message.includes('EADDRINUSE')) {
    process.exit(1);
  }
});

// ─── Memory Monitor (logging only, no restart) ──────────────────────────────
// Log memory every 60s so we can track trends in Render logs.
// Do NOT call process.exit here — that creates a restart storm.
setInterval(() => {
  const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const heap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  if (rss > 400) {
    console.warn(`[Memory] RSS=${rss}MB Heap=${heap}MB`);
  }
}, 60_000).unref();


// ─── App Setup ──────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────────

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const isVercelOrigin = (origin: string) =>
  /^https:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.vercel\.app$/.test(origin);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (isVercelOrigin(origin)) return true;
  return allowedOrigins.some((o) => origin === o || origin.startsWith(o));
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Reduced global limit from 1000 to 300
  message: { data: null, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' }, meta: null }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: { data: null, error: { code: 'TOO_MANY_REQUESTS', message: 'Sending messages too quickly' }, meta: null }
});

app.use('/api/', apiLimiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use(express.json({ limit: '128kb' })); // Reduced from 1mb to prevent OOM
app.use(express.urlencoded({ limit: '128kb', extended: true }));
app.use(cookieParser());

// ─── Root & Health ──────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    data: { name: 'Stride API', version: 'v1', status: 'ok' },
    error: null,
    meta: null,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() }, error: null, meta: null });
});

app.get('/api/v1/health', (_req, res) => {
  const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const heap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  res.json({
    data: { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), rssMB: rss, heapMB: heap },
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
app.use('/api/v1/messages', chatLimiter, messageRoutes); // Applied chat limiter here

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist' },
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
