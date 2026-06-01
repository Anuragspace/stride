import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { ConflictError } from '../lib/errors';

const router = Router();

const updateMeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().nullable().optional(),
});

// PATCH /api/v1/users/me
router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        meta: null,
      });
    }

    const body = updateMeSchema.parse(req.body);

    // If email is changing, check for uniqueness
    if (body.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    res.json({
      data: {
        user: updatedUser,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
