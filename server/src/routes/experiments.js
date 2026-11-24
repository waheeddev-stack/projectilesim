import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { notFound, wrap } from '../lib/errors.js';
import { requireUser } from '../lib/auth.js';
import { experimentSchema, idParamSchema, listQuerySchema } from '../lib/validators.js';
import { simulate } from '../../../client/src/physics/engine.js';
import { evaluateShot, scoreShot } from '../../../client/src/physics/target.js';

const router = Router();
router.use(requireUser);

const include = { targetAttempt: true };

router.get(
  '/',
  wrap(async (req, res) => {
    const { page, pageSize, mode, sort, order } = listQuerySchema.parse(req.query);
    const where = { userId: req.user.id, ...(mode ? { mode } : {}) };
    const [total, data] = await Promise.all([
      prisma.experiment.count({ where }),
      prisma.experiment.findMany({
        where,
        include,
        orderBy: [{ [sort]: order }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json({ data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

router.post(
  '/',
  wrap(async (req, res) => {
    const body = experimentSchema.parse(req.body);
    const { target, note, ...params } = body;

    // Results are recomputed server-side with the shared physics engine, so the
    // stored numbers can never disagree with the stored parameters.
    const result = simulate(params);

    let attempt;
    if (body.mode === 'target') {
      const t = { x: target.targetX, y: target.targetY, size: target.targetSize };
      const shot = evaluateShot(result.points, t);
      attempt = {
        targetX: target.targetX,
        targetY: target.targetY,
        targetSize: target.targetSize,
        difficulty: target.difficulty,
        hit: shot.hit,
        missDistance: shot.missDistance,
        score: scoreShot(shot, target.attempts),
      };
    }

    const experiment = await prisma.experiment.create({
      data: {
        userId: req.user.id,
        ...params,
        maxHeight: result.maxHeight,
        range: result.range,
        timeOfFlight: result.timeOfFlight,
        note: note || null,
        ...(attempt ? { targetAttempt: { create: attempt } } : {}),
      },
      include,
    });
    res.status(201).json({ data: experiment });
  }),
);

async function findOwned(req) {
  const { id } = idParamSchema.parse(req.params);
  // Filtering by userId means other users' rows look like "not found".
  const experiment = await prisma.experiment.findFirst({
    where: { id, userId: req.user.id },
    include,
  });
  if (!experiment) throw notFound('Experiment not found');
  return experiment;
}

router.get(
  '/:id',
  wrap(async (req, res) => {
    res.json({ data: await findOwned(req) });
  }),
);

router.delete(
  '/:id',
  wrap(async (req, res) => {
    const experiment = await findOwned(req);
    await prisma.experiment.delete({ where: { id: experiment.id } });
    res.json({ ok: true });
  }),
);

export default router;
