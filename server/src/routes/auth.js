import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { ApiError, wrap, unauthorized } from '../lib/errors.js';
import {
  clearAuthCookie,
  hashPassword,
  requireUser,
  setAuthCookie,
  signToken,
  verifyPassword,
} from '../lib/auth.js';
import { loginSchema, registerSchema } from '../lib/validators.js';

const router = Router();

// Basic brute-force protection for register/login (per IP).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts - try again in a few minutes' },
    }),
});

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

router.post(
  '/register',
  authLimiter,
  wrap(async (req, res) => {
    const { name, email, password } = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });
    setAuthCookie(res, signToken(user));
    res.status(201).json({ user: publicUser(user) });
  }),
);

router.post(
  '/login',
  authLimiter,
  wrap(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for unknown email and wrong password (no account enumeration).
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized('Invalid email or password');
    }
    setAuthCookie(res, signToken(user));
    res.json({ user: publicUser(user) });
  }),
);

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireUser, (req, res) => {
  res.json({ user: req.user });
});

export default router;
