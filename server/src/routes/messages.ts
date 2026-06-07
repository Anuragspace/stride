import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { getSocketIO } from '../lib/events';
import sanitizeHtml from 'sanitize-html';

const router = Router();

// Require auth for all message routes
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const getMessagesSchema = z.object({
  workspaceId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

const createMessageSchema = z.object({
  workspaceId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

// ─── GET /api/v1/messages ───────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, limit, cursor } = getMessagesSchema.parse(req.query);
    const userId = req.user!.id;

    // Verify user is a member of the workspace
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not a member of this workspace' },
        meta: null,
      });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { workspaceId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Check if there are more messages for infinite scrolling
    let nextCursor: string | undefined = undefined;
    if (messages.length === limit) {
      nextCursor = messages[messages.length - 1].id;
    }

    res.json({
      data: {
        messages: messages.reverse(), // Reverse to make chronological on client
        nextCursor,
      },
      error: null,
      meta: { total: messages.length },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/messages ──────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, content } = createMessageSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify user is a member of the workspace
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not a member of this workspace' },
        meta: null,
      });
      return;
    }

    const cleanContent = sanitizeHtml(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li', 'br', 'span', 'div'],
      allowedAttributes: {
        a: ['href', 'target', 'rel'],
        span: ['class', 'style'],
        div: ['class', 'style']
      },
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
      }
    });

    const message = await prisma.message.create({
      data: {
        workspaceId,
        senderId: userId,
        content: cleanContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Broadcast to workspace room
    const io = getSocketIO();
    if (io) {
      io.to(`workspace:${workspaceId}`).emit('message:new', message);
    }

    res.status(201).json({
      data: { message },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/v1/messages/:id ────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundError('Message');
    }

    // Only allow message sender or workspace admin/manager to delete
    if (message.senderId !== userId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: message.workspaceId, userId } },
      });

      if (!member || !['admin', 'manager'].includes(member.role)) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'You cannot delete this message' },
          meta: null,
        });
        return;
      }
    }

    await prisma.message.delete({
      where: { id },
    });

    // Broadcast message deletion event to workspace room
    const io = getSocketIO();
    if (io) {
      io.to(`workspace:${message.workspaceId}`).emit('message:deleted', { id });
    }

    res.json({
      data: { id },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
