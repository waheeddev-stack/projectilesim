import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();
const stamp = Date.now();
const emailA = `a_${stamp}@test.dev`;
const emailB = `b_${stamp}@test.dev`;
const password = 'password123';

const free = { mode: 'free', angle: 45, velocity: 20, note: 'test run' };

const agentA = request.agent(app);
const agentB = request.agent(app);

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$disconnect();
});

describe('auth', () => {
  it('rejects short passwords with the standard error format', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: emailA, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('registers, sets an httpOnly cookie and returns the user', async () => {
    const res = await agentA.post('/api/auth/register').send({ name: 'Alice', email: emailA, password });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Alice', email: emailA });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Alice', email: emailA, password });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('GET /me works with the cookie and fails without it', async () => {
    expect((await agentA.get('/api/auth/me')).body.user.email).toBe(emailA);
    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a wrong password and accepts the right one', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: emailA, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    const ok = await request(app).post('/api/auth/login').send({ email: emailA, password });
    expect(ok.status).toBe(200);
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: emailA, password });
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('experiments', () => {
  let id;

  beforeAll(async () => {
    await agentB.post('/api/auth/register').send({ name: 'Bob', email: emailB, password });
  });

  it('requires authentication', async () => {
    expect((await request(app).get('/api/experiments')).status).toBe(401);
    expect((await request(app).post('/api/experiments').send(free)).status).toBe(401);
    expect((await request(app).get('/api/stats')).status).toBe(401);
  });

  it('validates the body', async () => {
    const res = await agentA.post('/api/experiments').send({ ...free, angle: 120 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates an experiment and recomputes results on the server', async () => {
    const res = await agentA.post('/api/experiments').send({ ...free, range: 1, maxHeight: 999 });
    expect(res.status).toBe(201);
    id = res.body.data.id;
    expect(res.body.data.range).toBeCloseTo(40.77, 1);
    expect(res.body.data.maxHeight).toBeCloseTo(10.19, 1);
    expect(res.body.data.timeOfFlight).toBeCloseTo(2.88, 1);
  });

  it('creates a target-mode experiment with a scored attempt', async () => {
    const res = await agentA.post('/api/experiments').send({
      mode: 'target',
      angle: 45,
      velocity: 20,
      target: { targetX: 40.8, targetY: 0, targetSize: 4, difficulty: 'easy', attempts: 1 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.targetAttempt.hit).toBe(true);
    expect(res.body.data.targetAttempt.score).toBeGreaterThan(50);
  });

  it('requires target details in target mode', async () => {
    const res = await agentA.post('/api/experiments').send({ mode: 'target', angle: 45, velocity: 20 });
    expect(res.status).toBe(400);
  });

  it('lists with pagination, filtering and sorting', async () => {
    const all = await agentA.get('/api/experiments?pageSize=1&sort=range&order=desc');
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(1);
    expect(all.body.total).toBeGreaterThanOrEqual(2);
    const targets = await agentA.get('/api/experiments?mode=target');
    expect(targets.body.data.every((e) => e.mode === 'target')).toBe(true);
    expect((await agentA.get('/api/experiments?sort=passwordHash')).status).toBe(400);
  });

  it('gets one experiment', async () => {
    const res = await agentA.get(`/api/experiments/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it("does not expose another user's data", async () => {
    expect((await agentB.get(`/api/experiments/${id}`)).status).toBe(404);
    expect((await agentB.delete(`/api/experiments/${id}`)).status).toBe(404);
    expect((await agentB.get('/api/experiments')).body.total).toBe(0);
  });

  it('computes stats', async () => {
    const res = await agentA.get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totalRuns).toBeGreaterThanOrEqual(2);
    expect(res.body.attempts).toBe(1);
    expect(res.body.hits).toBe(1);
  });

  it('deletes an experiment', async () => {
    expect((await agentA.delete(`/api/experiments/${id}`)).status).toBe(200);
    expect((await agentA.get(`/api/experiments/${id}`)).status).toBe(404);
  });
});
