import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { fireEvent, createNotification, getSocketIO } from '../lib/events';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createCardSchema = z.object({
  canvasId: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(['task', 'bug', 'feature', 'story', 'design', 'research']).default('task'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  labels: z.array(z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  })).optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  type: z.enum(['task', 'bug', 'feature', 'story', 'design', 'research']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional().nullable(),
  position: z.number().int().min(0).optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  assignees: z.array(z.any()).optional(),
  labels: z.array(z.any()).optional(),
});

const moveCardSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
});

const reorderCardsSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int().min(0),
    assigneeIds: z.array(z.string().uuid()).optional(),
  })),
});

const addLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
});

const addSubTaskSchema = z.object({
  title: z.string().min(1).max(500),
});

const filterSchema = z.object({
  canvasId: z.string().uuid().optional(),
  columnId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  type: z.enum(['task', 'bug', 'feature', 'story', 'design', 'research']).optional(),
  status: z.enum(['completed', 'active', 'archived']).optional(),
  label: z.string().optional(),
  dueBefore: z.string().optional().nullable(),
  dueAfter: z.string().optional().nullable(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'position']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

router.use(authenticate);

// ─── Priority ordering for sorting ──────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

// ─── GET /api/cards ─────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = filterSchema.parse(req.query);

    const where: any = {};

    if (filters.canvasId) where.canvasId = filters.canvasId;
    if (filters.columnId) where.columnId = filters.columnId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;

    // Status filter
    if (filters.status === 'completed') {
      where.completed = true;
      where.archived = false;
    } else if (filters.status === 'archived') {
      where.archived = true;
    } else if (filters.status === 'active') {
      where.completed = false;
      where.archived = false;
    } else {
      where.archived = false; // Default: hide archived
    }

    // Assignee filter
    if (filters.assigneeId) {
      where.assignees = { some: { userId: filters.assigneeId } };
    }

    // Label filter
    if (filters.label) {
      where.labels = { some: { name: { contains: filters.label, mode: 'insensitive' } } };
    }

    // Due date filters
    if (filters.dueBefore || filters.dueAfter) {
      where.dueDate = {};
      if (filters.dueBefore) where.dueDate.lte = new Date(filters.dueBefore);
      if (filters.dueAfter) where.dueDate.gte = new Date(filters.dueAfter);
    }

    // Search
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    let orderBy: any = {};
    if (filters.sortBy === 'priority') {
      // Priority sort is handled post-query since it's an enum
      orderBy = { createdAt: filters.sortOrder };
    } else {
      orderBy = { [filters.sortBy]: filters.sortOrder };
    }

    const skip = (filters.page - 1) * filters.limit;

    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        include: {
          column: { select: { id: true, name: true, color: true } },
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          labels: true,
          _count: { select: { comments: true, subTasks: true, attachments: true } },
        },
        orderBy,
        skip,
        take: filters.limit,
      }),
      prisma.card.count({ where }),
    ]);

    // Post-sort by priority if needed
    let sortedCards = cards;
    if (filters.sortBy === 'priority') {
      sortedCards = [...cards].sort((a, b) => {
        const diff = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0);
        return filters.sortOrder === 'desc' ? -diff : diff;
      });
    }

    res.json({
      data: { cards: sortedCards },
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

// ─── POST /api/cards ────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCardSchema.parse(req.body);
    const userId = req.user!.id;

    // Single transaction: verify column, get max position, fetch workspaceId, create card
    const [column, canvas, maxPos] = await prisma.$transaction([
      prisma.canvasColumn.findUnique({ where: { id: body.columnId } }),
      prisma.canvas.findUnique({ where: { id: body.canvasId }, select: { workspaceId: true } }),
      prisma.card.aggregate({
        where: { columnId: body.columnId, archived: false },
        _max: { position: true },
      }),
    ]);

    if (!column || column.canvasId !== body.canvasId) {
      throw new BadRequestError('Column does not belong to the specified canvas');
    }

    const card = await prisma.card.create({
      data: {
        canvasId: body.canvasId,
        columnId: body.columnId,
        title: body.title,
        description: body.description,
        type: body.type,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        position: (maxPos._max.position ?? -1) + 1,
        assignees: body.assigneeIds
          ? { create: body.assigneeIds.map((uid) => ({ userId: uid })) }
          : undefined,
        labels: body.labels
          ? { create: body.labels }
          : undefined,
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        labels: true,
        _count: { select: { comments: true, subTasks: true, attachments: true } },
      },
    });

    // Fire-and-forget: audit log + notifications do not block the response
    fireEvent({
      type: 'card.created',
      actorId: userId,
      workspaceId: canvas?.workspaceId,
      canvasId: body.canvasId,
      cardId: card.id,
      metadata: { title: card.title, columnName: card.column.name },
    });

    if (body.assigneeIds) {
      for (const assigneeId of body.assigneeIds) {
        if (assigneeId !== userId) {
          createNotification({
            userId: assigneeId,
            type: 'card.assigned',
            title: 'Assigned to card',
            message: `You have been assigned to "${card.title}"`,
            metadata: { cardId: card.id, canvasId: body.canvasId },
          });
        }
      }
    }

    // Emit WebSocket update
    const io = getSocketIO();
    if (io) {
      io.to(`canvas:${body.canvasId}`).emit('card:created', card);
    }

    res.status(201).json({
      data: { card },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});


// ─── GET /api/cards/:cardId ─────────────────────────────────────────────────

router.get('/:cardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: {
        column: { select: { id: true, name: true, color: true } },
        canvas: { select: { id: true, name: true, workspaceId: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        labels: true,
        subTasks: { orderBy: { position: 'asc' } },
        comments: {
          where: { parentId: null },
          take: 5,
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            replies: {
              take: 5,
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
        _count: { select: { comments: true, subTasks: true, attachments: true } },
      },
    });

    if (!card) {
      throw new NotFoundError('Card');
    }

    res.json({
      data: { card },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/cards/:cardId ───────────────────────────────────────────────

router.patch('/:cardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateCardSchema.parse(req.body);
    const { assigneeIds, assignees, labels, ...rest } = body;
    const userId = req.user!.id;
    const cardId = req.params.cardId;

    // Normalize assignee user IDs
    let targetAssigneeIds: string[] | undefined = undefined;
    if (assigneeIds) {
      targetAssigneeIds = assigneeIds;
    } else if (assignees) {
      targetAssigneeIds = assignees
        .map((a: any) => {
          if (!a) return null;
          if (typeof a === 'string') return a;
          return a.id || a.userId;
        })
        .filter(Boolean) as string[];
    }

    // Normalize labels
    let targetLabels: { name: string; color: string }[] | undefined = undefined;
    if (labels) {
      targetLabels = labels
        .map((l: any) => {
          if (!l) return null;
          return {
            name: l.name,
            color: l.color || '#3B82F6',
          };
        })
        .filter(Boolean) as { name: string; color: string }[];
    }

    // Single transaction — no pre-fetch needed; events use card.canvasId from result
    const card = await prisma.$transaction(async (tx: any) => {
      if (targetAssigneeIds !== undefined) {
        await tx.cardAssignee.deleteMany({ where: { cardId } });
      }
      if (targetLabels !== undefined) {
        await tx.cardLabel.deleteMany({ where: { cardId } });
      }

      return tx.card.update({
        where: { id: cardId },
        data: {
          ...rest,
          dueDate: rest.dueDate !== undefined
            ? (rest.dueDate ? new Date(rest.dueDate) : null)
            : undefined,
          assignees: targetAssigneeIds !== undefined
            ? { create: targetAssigneeIds.map((uid) => ({ userId: uid })) }
            : undefined,
          labels: targetLabels !== undefined
            ? { create: targetLabels }
            : undefined,
        },
        include: {
          column: { select: { id: true, name: true, color: true } },
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          labels: true,
          _count: { select: { comments: true, subTasks: true, attachments: true } },
        },
      });
    }, {
      timeout: 15000,
    });

    // Fire-and-forget audit events (workspaceId optional — resolved async in fireEvent)
    if (rest.priority) {
      fireEvent({ type: 'card.priority_changed', actorId: userId, canvasId: card.canvasId, cardId: card.id, metadata: { newPriority: rest.priority } });
    }
    if (rest.dueDate !== undefined) {
      fireEvent({ type: 'card.due_date_changed', actorId: userId, canvasId: card.canvasId, cardId: card.id, metadata: { newDueDate: rest.dueDate } });
    }
    if (rest.title) {
      fireEvent({ type: 'card.edited', actorId: userId, canvasId: card.canvasId, cardId: card.id, metadata: { title: card.title } });
    }
    if (targetAssigneeIds !== undefined) {
      fireEvent({ type: 'card.assigned', actorId: userId, canvasId: card.canvasId, cardId: card.id, metadata: { assigneeCount: targetAssigneeIds.length } });
    }

    // Emit WebSocket update
    const io = getSocketIO();
    if (io) {
      io.to(`canvas:${card.canvasId}`).emit('card:updated', card);
    }

    res.json({ data: { card }, error: null, meta: null });
  } catch (error) {
    next(error);
  }
});


// ─── POST /api/cards/reorder ───────────────────────────────────────────────

router.post('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updates } = reorderCardsSchema.parse(req.body);

    // Sort updates by id alphabetically to prevent deadlock situations during concurrent bulk reorders
    const sortedUpdates = [...updates].sort((a, b) => a.id.localeCompare(b.id));

    const cardsWithAssigneeChanges = sortedUpdates.filter(u => u.assigneeIds !== undefined);

    const transactionActions = [];

    // Add deleteMany actions for assignees first to avoid unique key conflicts
    for (const u of cardsWithAssigneeChanges) {
      transactionActions.push(
        prisma.cardAssignee.deleteMany({
          where: { cardId: u.id },
        })
      );
    }

    // Add updates actions (which include position and assignee inserts)
    for (const u of sortedUpdates) {
      transactionActions.push(
        prisma.card.update({
          where: { id: u.id },
          data: {
            position: u.position,
            assignees: u.assigneeIds !== undefined ? {
              create: u.assigneeIds.map(uid => ({ userId: uid })),
            } : undefined,
          },
          include: {
            column: { select: { id: true, name: true, color: true } },
            assignees: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
            },
            labels: true,
            _count: { select: { comments: true, subTasks: true, attachments: true } },
          },
        })
      );
    }

    const results = await prisma.$transaction(transactionActions);

    // Extract the updated card objects (which are returned by the update statements)
    const updatedCards = results.slice(cardsWithAssigneeChanges.length) as any[];

    // Emit WebSocket update for each updated card
    const io = getSocketIO();
    if (io) {
      for (const card of updatedCards) {
        io.to(`canvas:${card.canvasId}`).emit('card:updated', card);
      }
    }

    res.json({
      data: { cards: updatedCards },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/cards/:cardId/move ───────────────────────────────────────────

router.post('/:cardId/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = moveCardSchema.parse(req.body);
    const userId = req.user!.id;

    const existing = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: {
        column: { select: { id: true, name: true } },
        canvas: { select: { workspaceId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError('Card');
    }

    const targetColumn = await prisma.canvasColumn.findUnique({
      where: { id: body.columnId },
    });

    if (!targetColumn) {
      throw new NotFoundError('Target column');
    }

    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data: {
        columnId: body.columnId,
        position: body.position,
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        labels: true,
        _count: { select: { comments: true, subTasks: true, attachments: true } },
      },
    });

    if (existing.columnId !== body.columnId) {
      fireEvent({
        type: 'card.moved',
        actorId: userId,
        workspaceId: existing.canvas.workspaceId,
        canvasId: existing.canvasId,
        cardId: card.id,
        metadata: {
          fromColumn: existing.column.name,
          toColumn: targetColumn.name,
        },
      });

      // Also fire status_changed
      fireEvent({
        type: 'card.status_changed',
        actorId: userId,
        workspaceId: existing.canvas.workspaceId,
        canvasId: existing.canvasId,
        cardId: card.id,
        metadata: {
          oldStatus: existing.column.name,
          newStatus: targetColumn.name,
        },
      });
    }

    // Emit WebSocket update
    const io = getSocketIO();
    if (io) {
      io.to(`canvas:${card.canvasId}`).emit('card:moved', card);
    }

    res.json({
      data: { card },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/cards/:cardId/complete ───────────────────────────────────────

router.post('/:cardId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { canvas: { select: { workspaceId: true } } },
    });

    if (!existing) throw new NotFoundError('Card');

    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data: {
        completed: true,
        completedAt: new Date(),
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        labels: true,
        _count: { select: { comments: true, subTasks: true, attachments: true } },
      },
    });

    fireEvent({
      type: 'card.completed',
      actorId: req.user!.id,
      workspaceId: existing.canvas.workspaceId,
      canvasId: existing.canvasId,
      cardId: card.id,
      metadata: { title: card.title },
    });

    // Notify assigned users
    const actor = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    });
    const actorName = actor?.name || 'Someone';
    if (card.assignees) {
      for (const assignee of card.assignees) {
        if (assignee.userId !== req.user!.id) {
          createNotification({
            userId: assignee.userId,
            type: 'card.completed',
            title: 'Card completed',
            message: `"${card.title}" has been completed by ${actorName}`,
            metadata: { cardId: card.id, canvasId: existing.canvasId },
          });
        }
      }
    }

    // Emit WebSocket update
    const io = getSocketIO();
    if (io) {
      io.to(`canvas:${card.canvasId}`).emit('card:updated', card);
    }

    res.json({
      data: { card },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/cards/:cardId/reopen ─────────────────────────────────────────

router.post('/:cardId/reopen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { canvas: { select: { workspaceId: true } } },
    });

    if (!existing) throw new NotFoundError('Card');

    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data: {
        completed: false,
        completedAt: null,
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        labels: true,
        _count: { select: { comments: true, subTasks: true, attachments: true } },
      },
    });

    fireEvent({
      type: 'card.reopened',
      actorId: req.user!.id,
      workspaceId: existing.canvas.workspaceId,
      canvasId: existing.canvasId,
      cardId: card.id,
      metadata: { title: card.title },
    });

    // Emit WebSocket update
    const io = getSocketIO();
    if (io) {
      io.to(`canvas:${card.canvasId}`).emit('card:updated', card);
    }

    res.json({
      data: { card },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/cards/:cardId/archive ────────────────────────────────────────

router.post('/:cardId/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { canvas: { select: { workspaceId: true } } },
    });

    if (!existing) throw new NotFoundError('Card');

    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    fireEvent({
      type: 'card.archived',
      actorId: req.user!.id,
      workspaceId: existing.canvas.workspaceId,
      canvasId: existing.canvasId,
      cardId: card.id,
      metadata: { title: card.title },
    });

    res.json({
      data: { card },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/cards/:cardId/restore ────────────────────────────────────────

router.post('/:cardId/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { canvas: { select: { workspaceId: true } } },
    });

    if (!existing) throw new NotFoundError('Card');

    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data: {
        archived: false,
        archivedAt: null,
      },
    });

    fireEvent({
      type: 'card.restored',
      actorId: req.user!.id,
      workspaceId: existing.canvas.workspaceId,
      canvasId: existing.canvasId,
      cardId: card.id,
      metadata: { title: card.title },
    });

    res.json({
      data: { card },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/cards/:cardId ──────────────────────────────────────────────

router.delete('/:cardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { canvas: { select: { workspaceId: true } } },
    });

    if (!existing) throw new NotFoundError('Card');

    await prisma.card.delete({
      where: { id: req.params.cardId },
    });

    fireEvent({
      type: 'card.deleted',
      actorId: req.user!.id,
      workspaceId: existing.canvas.workspaceId,
      canvasId: existing.canvasId,
      metadata: { cardId: existing.id, title: existing.title },
    });

    // Emit WebSocket update
    const io = getSocketIO();
    if (io) {
      io.to(`canvas:${existing.canvasId}`).emit('card:deleted', { cardId: req.params.cardId });
    }

    res.json({
      data: { message: 'Card deleted successfully' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Assignees ──────────────────────────────────────────────────────────────

// POST /api/cards/:cardId/assignees
router.post('/:cardId/assignees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: assigneeId } = z.object({ userId: z.string().uuid() }).parse(req.body);

    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { canvas: { select: { workspaceId: true } } },
    });

    if (!card) throw new NotFoundError('Card');

    const assignee = await prisma.cardAssignee.create({
      data: {
        cardId: req.params.cardId,
        userId: assigneeId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    fireEvent({
      type: 'card.assigned',
      actorId: req.user!.id,
      workspaceId: card.canvas.workspaceId,
      canvasId: card.canvasId,
      cardId: card.id,
      metadata: { assigneeId, assigneeName: assignee.user.name },
    });

    if (assigneeId !== req.user!.id) {
      createNotification({
        userId: assigneeId,
        type: 'card.assigned',
        title: 'Assigned to card',
        message: `You have been assigned to "${card.title}"`,
        metadata: { cardId: card.id, canvasId: card.canvasId },
      });
    }

    res.status(201).json({
      data: { assignee },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:cardId/assignees/:userId
router.delete('/:cardId/assignees/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { canvas: { select: { workspaceId: true } } },
    });

    if (!card) throw new NotFoundError('Card');

    await prisma.cardAssignee.delete({
      where: {
        cardId_userId: {
          cardId: req.params.cardId,
          userId: req.params.userId,
        },
      },
    });

    fireEvent({
      type: 'card.unassigned',
      actorId: req.user!.id,
      workspaceId: card.canvas.workspaceId,
      canvasId: card.canvasId,
      cardId: card.id,
      metadata: { unassignedUserId: req.params.userId },
    });

    res.json({
      data: { message: 'Assignee removed' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Labels ─────────────────────────────────────────────────────────────────

// POST /api/cards/:cardId/labels
router.post('/:cardId/labels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = addLabelSchema.parse(req.body);

    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
    });

    if (!card) throw new NotFoundError('Card');

    const label = await prisma.cardLabel.create({
      data: {
        cardId: req.params.cardId,
        name: body.name,
        color: body.color,
      },
    });

    res.status(201).json({
      data: { label },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:cardId/labels/:labelId
router.delete('/:cardId/labels/:labelId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const label = await prisma.cardLabel.findUnique({
      where: { id: req.params.labelId },
    });

    if (!label || label.cardId !== req.params.cardId) {
      throw new NotFoundError('Label');
    }

    await prisma.cardLabel.delete({
      where: { id: req.params.labelId },
    });

    res.json({
      data: { message: 'Label removed' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Sub-tasks ──────────────────────────────────────────────────────────────

// GET /api/cards/:cardId/subtasks
router.get('/:cardId/subtasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subTasks = await prisma.subTask.findMany({
      where: { cardId: req.params.cardId },
      orderBy: { position: 'asc' },
    });

    res.json({
      data: { subTasks },
      error: null,
      meta: { total: subTasks.length },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cards/:cardId/subtasks
router.post('/:cardId/subtasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = addSubTaskSchema.parse(req.body);

    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
    });

    if (!card) throw new NotFoundError('Card');

    const maxPos = await prisma.subTask.aggregate({
      where: { cardId: req.params.cardId },
      _max: { position: true },
    });

    const subTask = await prisma.subTask.create({
      data: {
        cardId: req.params.cardId,
        title: body.title,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });

    res.status(201).json({
      data: { subTask },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/cards/:cardId/subtasks/:subtaskId
router.patch('/:cardId/subtasks/:subtaskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = z.object({
      title: z.string().min(1).max(500).optional(),
      completed: z.boolean().optional(),
      position: z.number().int().min(0).optional(),
    }).parse(req.body);

    const subTask = await prisma.subTask.findUnique({
      where: { id: req.params.subtaskId },
    });

    if (!subTask || subTask.cardId !== req.params.cardId) {
      throw new NotFoundError('Sub-task');
    }

    const updated = await prisma.subTask.update({
      where: { id: req.params.subtaskId },
      data: body,
    });

    res.json({
      data: { subTask: updated },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:cardId/subtasks/:subtaskId
router.delete('/:cardId/subtasks/:subtaskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subTask = await prisma.subTask.findUnique({
      where: { id: req.params.subtaskId },
    });

    if (!subTask || subTask.cardId !== req.params.cardId) {
      throw new NotFoundError('Sub-task');
    }

    await prisma.subTask.delete({
      where: { id: req.params.subtaskId },
    });

    res.json({
      data: { message: 'Sub-task deleted' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Bookmarks ──────────────────────────────────────────────────────────────

// POST /api/cards/:cardId/bookmark
router.post('/:cardId/bookmark', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const card = await prisma.card.findUnique({ where: { id: req.params.cardId } });
    if (!card) throw new NotFoundError('Card');

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_cardId: {
          userId: req.user!.id,
          cardId: req.params.cardId,
        },
      },
      create: {
        userId: req.user!.id,
        cardId: req.params.cardId,
      },
      update: {},
    });

    res.status(201).json({
      data: { bookmark },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:cardId/bookmark
router.delete('/:cardId/bookmark', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.bookmark.delete({
      where: {
        userId_cardId: {
          userId: req.user!.id,
          cardId: req.params.cardId,
        },
      },
    });

    res.json({
      data: { message: 'Bookmark removed' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
