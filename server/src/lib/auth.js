import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';
import { unauthorized } from './errors.js';

export const COOKIE_NAME = 'pms_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET must be set (16+ characters) in server/.env');
  return s;
}

export const hashPassword = (password) => bcrypt.hash(password, 10);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export const signToken = (user) =>
  jwt.sign({ sub: String(user.id) }, secret(), { expiresIn: '7d' });

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, { path: '/' });

/** Auth middleware: verifies the JWT cookie (or Bearer token) and sets req.user. */
export async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
    if (!token) throw unauthorized();
    let payload;
    try {
      payload = jwt.verify(token, secret());
    } catch {
      throw unauthorized('Session expired - please log in again');
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw unauthorized();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
