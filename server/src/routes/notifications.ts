import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// ─── GET /api/notifications ─────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const unreadOnly = req.query.unreadOnly === 'true';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    // Parse metadata
    const parsed = notifications.map((n: any) => ({
      ...n,
      metadata: n.metadata || null,
    }));

    res.json({
      data: { notifications: parsed },
      error: null,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/notifications/:notificationId/read ───────────────────────────

router.post('/:notificationId/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.notificationId },
    });

    if (!notification || notification.userId !== req.user!.id) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
        meta: null,
      });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.notificationId },
      data: { read: true },
    });

    res.json({
      data: {
        notification: {
          ...updated,
          metadata: updated.metadata || null,
        },
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/notifications/read-all ───────────────────────────────────────

router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });

    res.json({
      data: { markedRead: result.count },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/notifications/:notificationId ──────────────────────────────

router.delete('/:notificationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.notificationId },
    });

    if (!notification || notification.userId !== req.user!.id) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
        meta: null,
      });
      return;
    }

    await prisma.notification.delete({
      where: { id: req.params.notificationId },
    });

    res.json({
      data: { message: 'Notification deleted' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
