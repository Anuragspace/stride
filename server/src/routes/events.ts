import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const querySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  canvasId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

router.use(authenticate);

// ─── GET /api/events ────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = querySchema.parse(req.query);

    const where: Record<string, unknown> = {};

    if (filters.workspaceId) where.workspaceId = filters.workspaceId;
    if (filters.canvasId) where.canvasId = filters.canvasId;
    if (filters.cardId) where.cardId = filters.cardId;
    if (filters.type) where.type = filters.type;

    const skip = (filters.page - 1) * filters.limit;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, avatarUrl: true } },
          canvas: { select: { id: true, name: true } },
          card: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Parse metadata JSON for each event
    const eventsWithParsedMeta = events.map((event: any) => ({
      ...event,
      metadata: event.metadata || null,
    }));

    res.json({
      data: { events: eventsWithParsedMeta },
      error: null,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/events/workspace/:workspaceId ─────────────────────────────────

router.get('/workspace/:workspaceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = querySchema.parse(req.query);
    const skip = (filters.page - 1) * filters.limit;

    const where: Record<string, unknown> = {
      workspaceId: req.params.workspaceId,
    };
    if (filters.type) where.type = filters.type;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, avatarUrl: true } },
          canvas: { select: { id: true, name: true } },
          card: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.event.count({ where }),
    ]);

    const eventsWithParsedMeta = events.map((event: any) => ({
      ...event,
      metadata: event.metadata || null,
    }));

    res.json({
      data: { events: eventsWithParsedMeta },
      error: null,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/events/canvas/:canvasId ───────────────────────────────────────

router.get('/canvas/:canvasId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = querySchema.parse(req.query);
    const skip = (filters.page - 1) * filters.limit;

    const where: Record<string, unknown> = {
      canvasId: req.params.canvasId,
    };
    if (filters.type) where.type = filters.type;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, avatarUrl: true } },
          card: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.event.count({ where }),
    ]);

    const eventsWithParsedMeta = events.map((event: any) => ({
      ...event,
      metadata: event.metadata || null,
    }));

    res.json({
      data: { events: eventsWithParsedMeta },
      error: null,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/events/card/:cardId ───────────────────────────────────────────

router.get('/card/:cardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = querySchema.parse(req.query);
    const skip = (filters.page - 1) * filters.limit;

    const where: Record<string, unknown> = {
      cardId: req.params.cardId,
    };
    if (filters.type) where.type = filters.type;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.event.count({ where }),
    ]);

    const eventsWithParsedMeta = events.map((event: any) => ({
      ...event,
      metadata: event.metadata || null,
    }));

    res.json({
      data: { events: eventsWithParsedMeta },
      error: null,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
