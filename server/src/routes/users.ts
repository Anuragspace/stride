import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { ConflictError } from '../lib/errors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure Multer for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.user?.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

const updateMeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().nullable().optional(),
});

// PATCH /api/v1/users/me
router.patch('/me', authenticate, upload.single('avatar'), async (req: Request, res: Response, next: NextFunction) => {
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

    // Reject data URIs immediately
    if (body.avatarUrl?.startsWith('data:')) {
      return res.status(400).json({
        data: null,
        error: { code: 'BAD_REQUEST', message: 'Base64 image uploads are not supported. Use multipart/form-data.' },
        meta: null,
      });
    }

    let finalAvatarUrl = body.avatarUrl;

    // If a file was uploaded, construct its local URL
    if (req.file) {
      finalAvatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(finalAvatarUrl !== undefined && { avatarUrl: finalAvatarUrl }),
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
