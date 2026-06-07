import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'stride-access-secret-dev-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'stride-refresh-secret-dev-key-change-in-production';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
}

export function generateTokenPair(payload: TokenPayload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

import prisma from './prisma';
import { UnauthorizedError } from './errors';

export async function saveRefreshToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
}

export async function deleteRefreshToken(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function rotateRefreshToken(oldToken: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
  // Validate token payload
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Find the token in the DB
  const existingToken = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  
  if (!existingToken) {
    // If token is valid but not in DB, it means it's a reused token (token theft detected!)
    // We should invalidate ALL refresh tokens for this user for security.
    await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });
    throw new UnauthorizedError('Token reuse detected. All sessions revoked. Please log in again.');
  }

  // Delete the old token (rotate it)
  await prisma.refreshToken.delete({ where: { id: existingToken.id } });

  // Get user details to return
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, emailVerified: true },
  });

  if (!user) {
    throw new UnauthorizedError('User no longer exists');
  }

  // Generate new tokens
  const newTokens = generateTokenPair({ userId: user.id, email: user.email });

  // Save the new token
  await saveRefreshToken(user.id, newTokens.refreshToken);

  return { user, ...newTokens };
}
