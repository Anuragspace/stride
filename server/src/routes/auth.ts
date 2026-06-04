import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { generateTokenPair, verifyRefreshToken } from '../lib/jwt';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { authenticate } from '../middleware/auth';
import { fireEvent } from '../lib/events';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/auth/signup ──────────────────────────────────────────────────

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        emailVerified: false,
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

    const tokens = generateTokenPair({ userId: user.id, email: user.email });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    res.status(201).json({
      data: {
        user,
        accessToken: tokens.accessToken,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = generateTokenPair({ userId: user.id, email: user.email });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', { path: '/' });
  res.json({
    data: { message: 'Logged out successfully' },
    error: null,
    meta: null,
  });
});

// ─── POST /api/auth/refresh ─────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const payload = verifyRefreshToken(refreshToken);

    // Check user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, emailVerified: true },
    });

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    const tokens = generateTokenPair({ userId: user.id, email: user.email });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      data: {
        user,
        accessToken: tokens.accessToken,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/google ──────────────────────────────────────────────────

router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential, inviteToken } = req.body;

    if (!credential) {
      throw new BadRequestError('Google credential is required');
    }

    // Server-to-server token validation
    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleResponse.ok) {
      throw new UnauthorizedError('Invalid Google credential');
    }

    const payload = (await googleResponse.json()) as any;

    // Verify audience matches the Client ID
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (payload.aud !== expectedClientId) {
      throw new UnauthorizedError('Google credential audience mismatch');
    }

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    if (!email) {
      throw new BadRequestError('Email not returned by Google');
    }

    // Check if user already exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (user) {
      // If there is an inviteToken, process the workspace join first
      if (inviteToken) {
        const invite = await prisma.invite.findUnique({
          where: { token: inviteToken },
        });

        if (!invite) {
          throw new NotFoundError('Invite');
        }
        if (invite.accepted) {
          throw new BadRequestError('This invite has already been accepted');
        }
        if (new Date() > invite.expiresAt) {
          throw new BadRequestError('This invite has expired');
        }
        if (invite.email !== email) {
          throw new BadRequestError('Your Google email does not match the invited email');
        }

        // Add user to workspace
        await prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId: user.id,
            },
          },
          create: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role,
          },
          update: {},
        });

        // Mark invite as accepted
        await prisma.invite.update({
          where: { id: invite.id },
          data: { accepted: true },
        });

        fireEvent({
          type: 'member.joined',
          actorId: user.id,
          workspaceId: invite.workspaceId,
          metadata: { memberId: user.id, memberName: user.name },
        });
      }

      // User exists, log them in!
      const tokens = generateTokenPair({ userId: user.id, email: user.email });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.json({
        data: {
          user,
          accessToken: tokens.accessToken,
          isNewUser: false,
        },
        error: null,
        meta: null,
      });
    } else {
      // User does not exist, return profile signup payload
      return res.json({
        data: {
          email,
          name,
          avatarUrl: picture,
          isNewUser: true,
        },
        error: null,
        meta: null,
      });
    }
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/google/register ──────────────────────────────────────────

router.post('/google/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential, name, avatarUrl, inviteToken } = req.body;

    if (!credential || !name) {
      throw new BadRequestError('Credential and name are required');
    }

    // Server-to-server token validation
    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleResponse.ok) {
      throw new UnauthorizedError('Invalid Google credential');
    }

    const payload = (await googleResponse.json()) as any;
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (payload.aud !== expectedClientId) {
      throw new UnauthorizedError('Google credential audience mismatch');
    }

    const email = payload.email;
    if (!email) {
      throw new BadRequestError('Email not returned by Google');
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      throw new ConflictError('A user with this email already exists');
    }

    // Generate random secure password for database compliance
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    user = await prisma.user.create({
      data: {
        email,
        name,
        avatarUrl,
        passwordHash,
        emailVerified: true,
      },
    });

    // If there is an inviteToken, process the workspace join
    if (inviteToken) {
      const invite = await prisma.invite.findUnique({
        where: { token: inviteToken },
      });

      if (!invite) {
        throw new NotFoundError('Invite');
      }
      if (invite.accepted) {
        throw new BadRequestError('This invite has already been accepted');
      }
      if (new Date() > invite.expiresAt) {
        throw new BadRequestError('This invite has expired');
      }
      if (invite.email !== email) {
        throw new BadRequestError('Your Google email does not match the invited email');
      }

      // Add user to workspace
      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId: user.id,
          },
        },
        create: {
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
        },
        update: {},
      });

      // Mark invite as accepted
      await prisma.invite.update({
        where: { id: invite.id },
        data: { accepted: true },
      });

      fireEvent({
        type: 'member.joined',
        actorId: user.id,
        workspaceId: invite.workspaceId,
        metadata: { memberId: user.id, memberName: user.name },
      });
    }

    const tokens = generateTokenPair({ userId: user.id, email: user.email });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(201).json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});


// ─── POST /api/auth/verify-email ────────────────────────────────────────────

router.post('/verify-email', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real app, this would check a token sent via email.
    // For dev/demo we just mark the user's email as verified.
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { emailVerified: true },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    res.json({
      data: { user },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/auth/invite-verify/:token ──────────────────────────────────────
router.get('/invite-verify/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new BadRequestError('Invite token is required');
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
        sender: { select: { name: true } },
      },
    });

    if (!invite) {
      throw new NotFoundError('Invite');
    }

    if (invite.accepted) {
      throw new BadRequestError('This invite has already been accepted');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestError('This invite has expired');
    }

    res.json({
      data: {
        email: invite.email,
        role: invite.role,
        workspaceName: invite.workspace.name,
        senderName: invite.sender.name,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/invite-accept ───────────────────────────────────────────

router.post('/invite-accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, name, password } = req.body;

    if (!token) {
      throw new BadRequestError('Invite token is required');
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invite) {
      throw new NotFoundError('Invite');
    }

    if (invite.accepted) {
      throw new BadRequestError('This invite has already been accepted');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestError('This invite has expired');
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (!user) {
      // New user — require name and password
      if (!name || !password) {
        throw new BadRequestError('Name and password are required for new users');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: {
          name,
          email: invite.email,
          passwordHash,
          emailVerified: true,
        },
      });
    }

    // Add user to workspace
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: user.id,
        },
      },
      create: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      },
      update: {},
    });

    // Mark invite as accepted
    await prisma.invite.update({
      where: { id: invite.id },
      data: { accepted: true },
    });

    const tokens = generateTokenPair({ userId: user.id, email: user.email });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
        },
        accessToken: tokens.accessToken,
        workspace: invite.workspace,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      data: { user },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
