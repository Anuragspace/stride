import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { NotFoundError } from '../lib/errors';
import { fireEvent, createNotification } from '../lib/events';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createCommentSchema = z.object({
  cardId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional().nullable(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

router.use(authenticate);

// ─── GET /api/comments?cardId=xxx ───────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cardId = req.query.cardId as string;

    if (!cardId) {
      res.status(400).json({
        data: null,
        error: { code: 'BAD_REQUEST', message: 'cardId query parameter is required' },
        meta: null,
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const comments = await prisma.comment.findMany({
      where: {
        cardId,
        parentId: null, // Top-level comments only
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          take: 10, // Limit nested replies
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.comment.count({ where: { cardId, parentId: null } });

    res.json({
      data: { comments },
      error: null,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/comments ────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCommentSchema.parse(req.body);
    const userId = req.user!.id;

    const card = await prisma.card.findUnique({
      where: { id: body.cardId },
      include: {
        canvas: { select: { workspaceId: true } },
        assignees: { select: { userId: true } },
      },
    });

    if (!card) {
      throw new NotFoundError('Card');
    }

    // If it's a reply, verify parent exists
    if (body.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: body.parentId },
      });
      if (!parent || parent.cardId !== body.cardId) {
        throw new NotFoundError('Parent comment');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        cardId: body.cardId,
        userId,
        parentId: body.parentId || null,
        content: body.content,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    fireEvent({
      type: 'comment.added',
      actorId: userId,
      workspaceId: card.canvas.workspaceId,
      canvasId: card.canvasId,
      cardId: card.id,
      metadata: {
        commentId: comment.id,
        isReply: !!body.parentId,
        preview: body.content.substring(0, 100),
      },
    });

    // Notify card assignees (except the commenter)
    for (const assignee of card.assignees) {
      if (assignee.userId !== userId) {
        createNotification({
          userId: assignee.userId,
          type: 'comment.added',
          title: 'New comment on your card',
          message: `New comment on "${card.title}": ${body.content.substring(0, 100)}`,
          metadata: { cardId: card.id, commentId: comment.id },
        });
      }
    }

    res.status(201).json({
      data: { comment },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/comments/:commentId ─────────────────────────────────────────

router.patch('/:commentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateCommentSchema.parse(req.body);

    const existing = await prisma.comment.findUnique({
      where: { id: req.params.commentId },
    });

    if (!existing) {
      throw new NotFoundError('Comment');
    }

    if (existing.userId !== req.user!.id) {
      res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: 'You can only edit your own comments' },
        meta: null,
      });
      return;
    }

    const comment = await prisma.comment.update({
      where: { id: req.params.commentId },
      data: { content: body.content },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({
      data: { comment },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/comments/:commentId ────────────────────────────────────────

router.delete('/:commentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.comment.findUnique({
      where: { id: req.params.commentId },
      include: {
        card: {
          include: { canvas: { select: { workspaceId: true } } },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Comment');
    }

    if (existing.userId !== req.user!.id) {
      res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: 'You can only delete your own comments' },
        meta: null,
      });
      return;
    }

    await prisma.comment.delete({
      where: { id: req.params.commentId },
    });

    fireEvent({
      type: 'comment.deleted',
      actorId: req.user!.id,
      workspaceId: existing.card.canvas.workspaceId,
      canvasId: existing.card.canvasId,
      cardId: existing.cardId,
      metadata: { commentId: existing.id },
    });

    res.json({
      data: { message: 'Comment deleted successfully' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
