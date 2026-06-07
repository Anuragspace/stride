import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorizeWorkspaceRole } from '../middleware/auth';
import { ConflictError, ForbiddenError, NotFoundError } from '../lib/errors';
import { fireEvent } from '../lib/events';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createCanvasSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  workspaceId: z.string().uuid(),
  icon: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  defaultView: z.enum(['board', 'table', 'list', 'calendar']).default('board'),
});

const updateCanvasSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().optional().nullable(),
  visibility: z.enum(['public', 'private']).optional(),
  defaultView: z.enum(['board', 'table', 'list', 'calendar']).optional(),
});

const createColumnSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
});

const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
});

const reorderColumnsSchema = z.object({
  columns: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

const addCanvasMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
});

router.use(authenticate);

// ─── Default columns for new canvases ───────────────────────────────────────

const DEFAULT_COLUMNS = [
  { name: 'Not Started', position: 0, color: '#6B7280' },
  { name: 'In Progress', position: 1, color: '#3B82F6' },
  { name: 'On Hold', position: 2, color: '#F59E0B' },
  { name: 'Done', position: 3, color: '#10B981' },
];

// ─── GET /api/canvases?workspaceId=xxx ──────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    const userId = req.user!.id;

    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({
        data: null,
        error: { code: 'BAD_REQUEST', message: 'workspaceId query parameter is required' },
        meta: null,
      });
      return;
    }

    // Verify user is workspace member
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    const canvases = await prisma.canvas.findMany({
      where: {
        workspaceId,
        archived: false,
      },
      include: {
        columns: { orderBy: { position: 'asc' } },
        _count: { select: { cards: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: { canvases },
      error: null,
      meta: { total: canvases.length },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/canvases ────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCanvasSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify user is workspace member
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: body.workspaceId, userId } },
    });

    if (!member) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    if (!['admin', 'manager'].includes(member.role)) {
      throw new ForbiddenError('Only admins and managers can create canvases');
    }

    const canvas = await prisma.canvas.create({
      data: {
        name: body.name,
        description: body.description,
        workspaceId: body.workspaceId,
        icon: body.icon || '📋',
        visibility: body.visibility,
        defaultView: body.defaultView,
        columns: {
          create: DEFAULT_COLUMNS,
        },
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: {
        columns: { orderBy: { position: 'asc' } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    fireEvent({
      type: 'canvas.created',
      actorId: userId,
      workspaceId: body.workspaceId,
      canvasId: canvas.id,
      metadata: { canvasName: canvas.name },
    });

    res.status(201).json({
      data: { canvas },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/canvases/:canvasId ────────────────────────────────────────────

router.get('/:canvasId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const canvas = await prisma.canvas.findUnique({
      where: { id: req.params.canvasId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas');
    }

    res.json({
      data: { canvas },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/canvases/:canvasId ──────────────────────────────────────────

router.patch('/:canvasId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateCanvasSchema.parse(req.body);

    const existing = await prisma.canvas.findUnique({
      where: { id: req.params.canvasId },
    });

    if (!existing) {
      throw new NotFoundError('Canvas');
    }

    const canvas = await prisma.canvas.update({
      where: { id: req.params.canvasId },
      data: body,
      include: {
        columns: { orderBy: { position: 'asc' } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({
      data: { canvas },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/canvases/:canvasId/archive ───────────────────────────────────

router.post('/:canvasId/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const canvas = await prisma.canvas.update({
      where: { id: req.params.canvasId },
      data: { archived: true },
    });

    fireEvent({
      type: 'canvas.archived',
      actorId: req.user!.id,
      workspaceId: canvas.workspaceId,
      canvasId: canvas.id,
      metadata: { canvasName: canvas.name },
    });

    res.json({
      data: { canvas },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/canvases/:canvasId ─────────────────────────────────────────

router.delete('/:canvasId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const canvas = await prisma.canvas.findUnique({
      where: { id: req.params.canvasId },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas');
    }

    await prisma.canvas.delete({
      where: { id: req.params.canvasId },
    });

    res.json({
      data: { message: 'Canvas deleted successfully' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Columns ────────────────────────────────────────────────────────────────

// POST /api/canvases/:canvasId/columns
router.post('/:canvasId/columns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createColumnSchema.parse(req.body);

    const canvas = await prisma.canvas.findUnique({
      where: { id: req.params.canvasId },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas');
    }

    // Get max position
    const maxPosition = await prisma.canvasColumn.aggregate({
      where: { canvasId: req.params.canvasId },
      _max: { position: true },
    });

    const column = await prisma.canvasColumn.create({
      data: {
        canvasId: req.params.canvasId,
        name: body.name,
        color: body.color || '#6B7280',
        position: body.position ?? ((maxPosition._max.position ?? -1) + 1),
        wipLimit: body.wipLimit,
      },
    });

    res.status(201).json({
      data: { column },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/canvases/:canvasId/columns/:columnId
router.patch('/:canvasId/columns/:columnId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateColumnSchema.parse(req.body);

    const column = await prisma.canvasColumn.findUnique({
      where: { id: req.params.columnId },
    });

    if (!column || column.canvasId !== req.params.canvasId) {
      throw new NotFoundError('Column');
    }

    const updated = await prisma.canvasColumn.update({
      where: { id: req.params.columnId },
      data: body,
    });

    res.json({
      data: { column: updated },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/canvases/:canvasId/columns/reorder
router.put('/:canvasId/columns/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = reorderColumnsSchema.parse(req.body);

    await prisma.$transaction(
      body.columns.map((col) =>
        prisma.canvasColumn.update({
          where: { id: col.id },
          data: { position: col.position },
        })
      )
    );

    const columns = await prisma.canvasColumn.findMany({
      where: { canvasId: req.params.canvasId },
      orderBy: { position: 'asc' },
    });

    res.json({
      data: { columns },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/canvases/:canvasId/columns/:columnId
router.delete('/:canvasId/columns/:columnId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const column = await prisma.canvasColumn.findUnique({
      where: { id: req.params.columnId },
      include: { _count: { select: { cards: true } } },
    });

    if (!column || column.canvasId !== req.params.canvasId) {
      throw new NotFoundError('Column');
    }

    if (column._count.cards > 0) {
      throw new ForbiddenError('Cannot delete a column that contains cards. Move or delete the cards first.');
    }

    await prisma.canvasColumn.delete({
      where: { id: req.params.columnId },
    });

    res.json({
      data: { message: 'Column deleted successfully' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Canvas Members ─────────────────────────────────────────────────────────

// GET /api/canvases/:canvasId/members
router.get('/:canvasId/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await prisma.canvasMember.findMany({
      where: { canvasId: req.params.canvasId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({
      data: { members },
      error: null,
      meta: { total: members.length },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/canvases/:canvasId/members
router.post('/:canvasId/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = addCanvasMemberSchema.parse(req.body);

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if already a member
    const existing = await prisma.canvasMember.findUnique({
      where: { canvasId_userId: { canvasId: req.params.canvasId, userId: body.userId } },
    });

    if (existing) {
      throw new ConflictError('User is already a member of this canvas');
    }

    const member = await prisma.canvasMember.create({
      data: {
        canvasId: req.params.canvasId,
        userId: body.userId,
        role: body.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    fireEvent({
      type: 'member.joined',
      actorId: req.user!.id,
      canvasId: req.params.canvasId,
      metadata: { userId: body.userId, userName: user.name },
    });

    res.status(201).json({
      data: { member },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/canvases/:canvasId/members/:memberId
router.delete('/:canvasId/members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await prisma.canvasMember.findUnique({
      where: { id: req.params.memberId },
    });

    if (!member || member.canvasId !== req.params.canvasId) {
      throw new NotFoundError('Canvas member');
    }

    await prisma.canvasMember.delete({
      where: { id: req.params.memberId },
    });

    res.json({
      data: { message: 'Member removed from canvas' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
