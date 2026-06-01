import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../lib/jwt';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import prisma from '../lib/prisma';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts and verifies the access token from the Authorization header.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Missing token');
    }

    const payload = verifyAccessToken(token);
    req.user = {
      ...payload,
      id: payload.userId,
    };

    next();
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
}

/**
 * Workspace role authorization middleware factory.
 * Must be used AFTER authenticate and AFTER the workspaceId is available in params.
 */
export function authorizeWorkspaceRole(...allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const workspaceId = req.params.workspaceId || req.body?.workspaceId;

      if (!userId) {
        throw new UnauthorizedError();
      }

      if (!workspaceId) {
        throw new ForbiddenError('Workspace ID is required');
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!member) {
        throw new ForbiddenError('You are not a member of this workspace');
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        throw new ForbiddenError(`Requires one of roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Canvas role authorization middleware factory.
 */
export function authorizeCanvasRole(...allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const canvasId = req.params.canvasId || req.body?.canvasId;

      if (!userId) {
        throw new UnauthorizedError();
      }

      if (!canvasId) {
        throw new ForbiddenError('Canvas ID is required');
      }

      const member = await prisma.canvasMember.findUnique({
        where: {
          canvasId_userId: { canvasId, userId },
        },
      });

      if (!member) {
        throw new ForbiddenError('You are not a member of this canvas');
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        throw new ForbiddenError(`Requires one of roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
