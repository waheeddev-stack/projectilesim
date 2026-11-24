import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { wrap } from '../lib/errors.js';
import { requireUser } from '../lib/auth.js';

const router = Router();
router.use(requireUser);

router.get(
  '/',
  wrap(async (req, res) => {
    const userId = req.user.id;
    const [totalRuns, avg, attempts, hits, best] = await Promise.all([
      prisma.experiment.count({ where: { userId } }),
      prisma.experiment.aggregate({
        where: { userId },
        _avg: { range: true, maxHeight: true, timeOfFlight: true },
      }),
      prisma.targetAttempt.count({ where: { experiment: { userId } } }),
      prisma.targetAttempt.count({ where: { experiment: { userId }, hit: true } }),
      prisma.targetAttempt.aggregate({
        where: { experiment: { userId } },
        _max: { score: true },
        _avg: { score: true },
      }),
    ]);
    res.json({
      totalRuns,
      attempts,
      hits,
      hitRate: attempts ? hits / attempts : 0,
      bestScore: best._max.score ?? 0,
      averageScore: best._avg.score ?? 0,
      averageRange: avg._avg.range ?? 0,
      averageMaxHeight: avg._avg.maxHeight ?? 0,
      averageTimeOfFlight: avg._avg.timeOfFlight ?? 0,
    });
  }),
);

export default router;
