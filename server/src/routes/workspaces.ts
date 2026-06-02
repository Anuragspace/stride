import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { authenticate, authorizeWorkspaceRole } from '../middleware/auth';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../lib/errors';
import { fireEvent, createNotification } from '../lib/events';
import { sendWorkspaceInviteEmail } from '../lib/email';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'member']).default('member'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'member']),
});

// All routes require authentication
router.use(authenticate);

// ─── GET /api/workspaces ────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { canvases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: { workspaces },
      error: null,
      meta: { total: workspaces.length },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/workspaces ───────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createWorkspaceSchema.parse(req.body);
    const userId = req.user!.id;

    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug: body.slug },
    });

    if (existingWorkspace) {
      throw new ConflictError('A workspace with this slug already exists');
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    res.status(201).json({
      data: { workspace },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/workspaces/:workspaceId ───────────────────────────────────────

router.get('/:workspaceId', authorizeWorkspaceRole(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { canvases: true } },
      },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace');
    }

    res.json({
      data: { workspace },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/workspaces/:workspaceId ─────────────────────────────────────

router.patch(
  '/:workspaceId',
  authorizeWorkspaceRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateWorkspaceSchema.parse(req.body);

      const workspace = await prisma.workspace.update({
        where: { id: req.params.workspaceId },
        data: body,
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
        },
      });

      res.json({
        data: { workspace },
        error: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/workspaces/:workspaceId ────────────────────────────────────

router.delete(
  '/:workspaceId',
  authorizeWorkspaceRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.workspace.delete({
        where: { id: req.params.workspaceId },
      });

      res.json({
        data: { message: 'Workspace deleted successfully' },
        error: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/workspaces/:workspaceId/members ──────────────────────────────

router.post(
  '/:workspaceId/members',
  authorizeWorkspaceRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role } = z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'manager', 'member']).default('member'),
      }).parse(req.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundError('User with this email not found');
      }

      // Check if user is already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: req.params.workspaceId,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        throw new ConflictError('User is already a member of this workspace');
      }

      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId: req.params.workspaceId,
          userId: user.id,
          role,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      await fireEvent({
        type: 'member.joined',
        actorId: req.user!.id,
        workspaceId: req.params.workspaceId,
        metadata: { memberId: user.id, memberName: user.name },
      });

      res.status(201).json({
        data: { member },
        error: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/workspaces/:workspaceId/members ───────────────────────────────

router.get(
  '/:workspaceId/members',
  authorizeWorkspaceRole(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: req.params.workspaceId },
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
  }
);

// ─── PATCH /api/workspaces/:workspaceId/members/:memberId ───────────────────

router.patch(
  '/:workspaceId/members/:memberId',
  authorizeWorkspaceRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateMemberRoleSchema.parse(req.body);

      const member = await prisma.workspaceMember.findUnique({
        where: { id: req.params.memberId },
      });

      if (!member || member.workspaceId !== req.params.workspaceId) {
        throw new NotFoundError('Member');
      }

      const updated = await prisma.workspaceMember.update({
        where: { id: req.params.memberId },
        data: { role: body.role },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      await fireEvent({
        type: 'member.role_changed',
        actorId: req.user!.id,
        workspaceId: req.params.workspaceId,
        metadata: {
          memberId: member.userId,
          oldRole: member.role,
          newRole: body.role,
        },
      });

      res.json({
        data: { member: updated },
        error: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/workspaces/:workspaceId/members/:memberId ──────────────────

router.delete(
  '/:workspaceId/members/:memberId',
  authorizeWorkspaceRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await prisma.workspaceMember.findUnique({
        where: { id: req.params.memberId },
      });

      if (!member || member.workspaceId !== req.params.workspaceId) {
        throw new NotFoundError('Member');
      }

      // Prevent removing self if admin
      if (member.userId === req.user!.id) {
        throw new BadRequestError('Cannot remove yourself from the workspace');
      }

      await prisma.workspaceMember.delete({
        where: { id: req.params.memberId },
      });

      res.json({
        data: { message: 'Member removed successfully' },
        error: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/workspaces/:workspaceId/invites ──────────────────────────────

router.post(
  '/:workspaceId/invites',
  authorizeWorkspaceRole('admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = inviteMemberSchema.parse(req.body);
      const workspaceId = req.params.workspaceId;

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        const existingMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId: existingUser.id },
          },
        });

        if (existingMember) {
          throw new ConflictError('User is already a member of this workspace');
        }
      }

      // Check for pending invite
      const existingInvite = await prisma.invite.findFirst({
        where: {
          workspaceId,
          email: body.email,
          accepted: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvite) {
        throw new ConflictError('An active invite already exists for this email');
      }

      const invite = await prisma.invite.create({
        data: {
          workspaceId,
          email: body.email,
          role: body.role,
          token: uuidv4(),
          senderId: req.user!.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        include: {
          workspace: { select: { id: true, name: true, slug: true } },
          sender: { select: { id: true, name: true, email: true } },
        },
      });

      // If the user already exists, notify them
      if (existingUser) {
        await createNotification({
          userId: existingUser.id,
          type: 'workspace_invite',
          title: 'Workspace Invitation',
          message: `You have been invited to join "${invite.workspace.name}"`,
          metadata: { inviteToken: invite.token, workspaceId },
        });
      }

      // Send invite email via Brevo / console fallback
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const inviteLink = `${clientUrl}/invite/${invite.token}`;

      try {
        await sendWorkspaceInviteEmail({
          email: invite.email,
          workspaceName: invite.workspace.name,
          senderName: invite.sender.name,
          inviteLink,
        });
      } catch (err) {
        console.error('Failed to send invite email:', err);
      }

      res.status(201).json({
        data: { invite },
        error: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/workspaces/:workspaceId/invites ───────────────────────────────

router.get(
  '/:workspaceId/invites',
  authorizeWorkspaceRole('admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invites = await prisma.invite.findMany({
        where: {
          workspaceId: req.params.workspaceId,
          accepted: false,
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        data: { invites },
        error: null,
        meta: { total: invites.length },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/workspaces/:workspaceId/invites/:inviteId ──────────────────

router.delete(
  '/:workspaceId/invites/:inviteId',
  authorizeWorkspaceRole('admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invite = await prisma.invite.findUnique({
        where: { id: req.params.inviteId },
      });

      if (!invite || invite.workspaceId !== req.params.workspaceId) {
        throw new NotFoundError('Invite');
      }

      await prisma.invite.delete({
        where: { id: req.params.inviteId },
      });

      res.json({
        data: { message: 'Invite revoked successfully' },
        error: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
