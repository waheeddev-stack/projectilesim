// Seeds a demo user with a few experiments. Safe to run repeatedly.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { simulate } from '../../client/src/physics/engine.js';

const prisma = new PrismaClient();

const DEMO = { name: 'Demo Student', email: 'demo@example.com', password: 'demo12345' };

const runs = [
  { angle: 45, velocity: 20 },
  { angle: 30, velocity: 35, airResistanceEnabled: true, dragCoeff: 0.8 },
  { angle: 60, velocity: 25, gravity: 1.62 },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO.email },
    update: {},
    create: {
      name: DEMO.name,
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 10),
    },
  });

  const existing = await prisma.experiment.count({ where: { userId: user.id } });
  if (existing === 0) {
    for (const run of runs) {
      const params = { initialHeight: 0, gravity: 9.81, airResistanceEnabled: false, mass: 0.145, dragCoeff: 0.47, area: 0.0043, airDensity: 1.225, ...run };
      const r = simulate(params);
      await prisma.experiment.create({
        data: {
          userId: user.id,
          mode: 'free',
          ...params,
          maxHeight: r.maxHeight,
          range: r.range,
          timeOfFlight: r.timeOfFlight,
          note: 'Seeded example run',
        },
      });
    }
  }
  console.log(`Seeded demo user: ${DEMO.email} / ${DEMO.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
