import { z } from 'zod';
import { LIMITS } from '../../../client/src/physics/engine.js';

const range = (key) => z.number().min(LIMITS[key].min).max(LIMITS[key].max);

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(190),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(72),
});

const targetSchema = z.object({
  targetX: z.number().min(0).max(5000),
  targetY: z.number().min(0).max(5000),
  targetSize: z.number().min(0.1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  attempts: z.number().int().min(1).max(10000).default(1),
});

export const experimentSchema = z
  .object({
    mode: z.enum(['free', 'target']),
    angle: range('angle'),
    velocity: range('velocity'),
    initialHeight: range('initialHeight').default(0),
    gravity: range('gravity').default(9.81),
    airResistanceEnabled: z.boolean().default(false),
    mass: range('mass').default(0.145),
    dragCoeff: range('dragCoeff').default(0.47),
    area: range('area').default(0.0043),
    airDensity: range('airDensity').default(1.225),
    note: z.string().trim().max(500).optional(),
    target: targetSchema.optional(),
  })
  .refine((v) => v.mode !== 'target' || v.target, {
    message: 'target details are required in target mode',
    path: ['target'],
  });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  mode: z.enum(['free', 'target']).optional(),
  sort: z.enum(['createdAt', 'range', 'maxHeight', 'velocity', 'angle']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
