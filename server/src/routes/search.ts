import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// ─── GET /api/search?q=xxx&workspaceId=xxx ──────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string)?.trim();
    const workspaceId = req.query.workspaceId as string;
    const type = req.query.type as string; // 'cards' | 'canvases' | 'all'
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    if (!q || q.length < 2) {
      res.json({
        data: { cards: [], canvases: [], users: [] },
        error: null,
        meta: { total: 0 },
      });
      return;
    }

    const searchType = type || 'all';
    const results: { cards?: unknown[]; canvases?: unknown[]; users?: unknown[] } = {};

    // Search cards
    if (searchType === 'all' || searchType === 'cards') {
      const cardWhere: Record<string, unknown> = {
        archived: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      };

      if (workspaceId) {
        cardWhere.canvas = { workspaceId };
      }

      const cards = await prisma.card.findMany({
        where: cardWhere,
        include: {
          column: { select: { id: true, name: true, color: true } },
          canvas: { select: { id: true, name: true, workspaceId: true } },
          assignees: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          labels: true,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });

      results.cards = cards;
    }

    // Search canvases
    if (searchType === 'all' || searchType === 'canvases') {
      const canvasWhere: Record<string, unknown> = {
        archived: false,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      };

      if (workspaceId) {
        canvasWhere.workspaceId = workspaceId;
      }

      const canvases = await prisma.canvas.findMany({
        where: canvasWhere,
        include: {
          _count: { select: { cards: true, members: true } },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });

      results.canvases = canvases;
    }

    // Search users (workspace-scoped if workspaceId provided)
    if (searchType === 'all' || searchType === 'users') {
      const userWhere: Record<string, unknown> = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };

      if (workspaceId) {
        userWhere.workspaceMembers = { some: { workspaceId } };
      }

      const users = await prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
        take: limit,
      });

      results.users = users;
    }

    const totalResults =
      (results.cards?.length || 0) +
      (results.canvases?.length || 0) +
      (results.users?.length || 0);

    res.json({
      data: results,
      error: null,
      meta: { total: totalResults, query: q },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
