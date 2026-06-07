import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from './prisma';
import { UnauthorizedError } from './errors';

// Enforce secrets in production
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_HASH_SECRET = process.env.JWT_REFRESH_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!ACCESS_TOKEN_SECRET) throw new Error('Missing JWT_SECRET in production');
  if (!REFRESH_TOKEN_HASH_SECRET) throw new Error('Missing JWT_REFRESH_SECRET in production');
}

const SECURE_ACCESS = ACCESS_TOKEN_SECRET || 'stride-access-secret-dev-key-change-in-production';
const SECURE_REFRESH = REFRESH_TOKEN_HASH_SECRET || 'stride-refresh-secret-dev-key-change-in-production';

const ACCESS_TOKEN_EXPIRY = '15m';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECURE_ACCESS, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, SECURE_ACCESS) as TokenPayload;
}

// Generate Opaque Refresh Token
export function generateOpaqueRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

// Hash token for database storage
export function hashToken(token: string): string {
  return crypto.createHmac('sha256', SECURE_REFRESH).update(token).digest('hex');
}

export function generateTokenPair(payload: TokenPayload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateOpaqueRefreshToken(),
  };
}

export async function saveRefreshToken(userId: string, token: string, userAgent?: string, ipAddress?: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const tokenHash = hashToken(token);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt, userAgent, ipAddress },
  });
}

export async function deleteRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true }
  });
}

export async function rotateRefreshToken(oldToken: string, userAgent?: string, ipAddress?: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
  const oldTokenHash = hashToken(oldToken);
  
  // Find the token in the DB
  const existingToken = await prisma.refreshToken.findUnique({ where: { tokenHash: oldTokenHash } });
  
  if (!existingToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (existingToken.revoked || existingToken.expiresAt < new Date()) {
    // Token reuse detected! Someone used a revoked token. Invalidate all.
    await prisma.refreshToken.updateMany({
      where: { userId: existingToken.userId },
      data: { revoked: true }
    });
    throw new UnauthorizedError('Token reuse detected or token expired. All sessions revoked. Please log in again.');
  }

  // Revoke the old token (rotate it)
  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: { revoked: true }
  });

  // Get user details to return
  const user = await prisma.user.findUnique({
    where: { id: existingToken.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, emailVerified: true },
  });

  if (!user) {
    throw new UnauthorizedError('User no longer exists');
  }

  // Generate new tokens
  const newTokens = generateTokenPair({ userId: user.id, email: user.email });

  // Save the new token
  await saveRefreshToken(user.id, newTokens.refreshToken, userAgent, ipAddress);

  return { user, ...newTokens };
}
