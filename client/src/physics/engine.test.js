import { describe, expect, it } from 'vitest';
import {
  compare,
  dragCoeffFromLevel,
  dragConstant,
  levelFromDragCoeff,
  normalizeParams,
  pointAtTime,
  simulate,
  simulateDrag,
  simulateIdeal,
} from './engine.js';
import { evaluateShot, pointSegmentDistance, scoreShot } from './target.js';

describe('ideal projectile (closed form)', () => {
  const r = simulateIdeal({ velocity: 20, angle: 45, gravity: 9.81 });

  it('matches the textbook range, max height and flight time', () => {
    expect(r.range).toBeCloseTo(40.77, 2);
    expect(r.maxHeight).toBeCloseTo(10.19, 2);
    expect(r.timeOfFlight).toBeCloseTo(2.88, 2);
  });

  it('starts at the launch point and ends on the ground', () => {
    expect(r.points[0]).toMatchObject({ t: 0, x: 0, y: 0 });
    const last = r.points[r.points.length - 1];
    expect(last.y).toBe(0);
    expect(last.x).toBeCloseTo(r.range, 9);
  });

  it('apex happens at vy / g', () => {
    expect(r.apexTime).toBeCloseTo((20 * Math.sin(Math.PI / 4)) / 9.81, 6);
  });

  it('90 degrees gives zero range', () => {
    const up = simulateIdeal({ velocity: 25, angle: 90 });
    expect(up.range).toBe(0);
    expect(up.maxHeight).toBeCloseTo(625 / (2 * 9.81), 6);
  });

  it('0 degrees from a height falls like a horizontal launch', () => {
    const r2 = simulateIdeal({ velocity: 10, angle: 0, initialHeight: 20, gravity: 9.81 });
    expect(r2.timeOfFlight).toBeCloseTo(Math.sqrt((2 * 20) / 9.81), 6);
    expect(r2.range).toBeCloseTo(10 * r2.timeOfFlight, 6);
    expect(r2.maxHeight).toBe(20);
  });

  it('lower gravity flies further (Moon vs Earth)', () => {
    const moon = simulateIdeal({ velocity: 20, angle: 45, gravity: 1.62 });
    expect(moon.range).toBeGreaterThan(r.range * 5);
  });

  it('handles zero velocity from the ground without NaN', () => {
    const z = simulateIdeal({ velocity: 0, angle: 45 });
    expect(z.range).toBe(0);
    expect(z.timeOfFlight).toBe(0);
    expect(z.points).toHaveLength(1);
  });
});

describe('drag projectile (RK4)', () => {
  const base = { velocity: 40, angle: 45, gravity: 9.81 };

  it('range with drag is shorter than ideal range', () => {
    const drag = simulateDrag({ ...base, airResistanceEnabled: true, dragK: 0.01 });
    const ideal = simulateIdeal(base);
    expect(drag.range).toBeLessThan(ideal.range);
    expect(drag.maxHeight).toBeLessThan(ideal.maxHeight);
    expect(drag.timeOfFlight).toBeLessThan(ideal.timeOfFlight);
  });

  it('matches the closed form when k is ~0', () => {
    const drag = simulateDrag({ ...base, dragK: 1e-9 });
    const ideal = simulateIdeal(base);
    expect(drag.range).toBeCloseTo(ideal.range, 2);
    expect(drag.maxHeight).toBeCloseTo(ideal.maxHeight, 2);
    expect(drag.timeOfFlight).toBeCloseTo(ideal.timeOfFlight, 2);
  });

  it('matches the closed form from a height too', () => {
    const p = { velocity: 15, angle: 30, initialHeight: 12, dragK: 0 };
    const drag = simulateDrag(p);
    const ideal = simulateIdeal(p);
    expect(drag.range).toBeCloseTo(ideal.range, 2);
    expect(drag.timeOfFlight).toBeCloseTo(ideal.timeOfFlight, 2);
  });

  it('lands exactly on the ground (interpolated)', () => {
    const drag = simulateDrag({ ...base, dragK: 0.02 });
    const last = drag.points[drag.points.length - 1];
    expect(last.y).toBe(0);
    expect(last.x).toBeCloseTo(drag.range, 9);
  });

  it('impact angle is steeper than launch angle with drag', () => {
    const drag = simulateDrag({ ...base, dragK: 0.02 });
    const ideal = simulateIdeal(base);
    expect(drag.impactAngle).toBeGreaterThan(ideal.impactAngle);
  });

  it('stronger drag means shorter range', () => {
    const a = simulateDrag({ ...base, dragK: 0.005 }).range;
    const b = simulateDrag({ ...base, dragK: 0.02 }).range;
    expect(b).toBeLessThan(a);
  });

  it('computes k = 0.5 rho Cd A / m', () => {
    expect(dragConstant({ airDensity: 1.2, dragCoeff: 0.5, area: 0.01, mass: 0.1 })).toBeCloseTo(0.03, 9);
  });

  it('stays bounded in size for very long flights', () => {
    const slow = simulateDrag({ velocity: 200, angle: 90, gravity: 0.1, dragK: 0 });
    expect(slow.points.length).toBeLessThan(5000);
    expect(slow.timeOfFlight).toBeGreaterThan(3000);
  });
});

describe('simulate / compare / helpers', () => {
  it('simulate picks the model from airResistanceEnabled', () => {
    const on = simulate({ velocity: 30, angle: 40, airResistanceEnabled: true });
    const off = simulate({ velocity: 30, angle: 40, airResistanceEnabled: false });
    expect(on.range).toBeLessThan(off.range);
  });

  it('compare returns both trajectories', () => {
    const c = compare({ velocity: 30, angle: 40 });
    expect(c.drag.range).toBeLessThan(c.ideal.range);
  });

  it('normalizeParams clamps and defaults', () => {
    const p = normalizeParams({ velocity: 9999, angle: -5, gravity: 'abc', mass: 0 });
    expect(p.velocity).toBe(200);
    expect(p.angle).toBe(0);
    expect(p.gravity).toBe(9.81);
    expect(p.mass).toBe(0.01);
  });

  it('level <-> drag coefficient round trips', () => {
    expect(levelFromDragCoeff(dragCoeffFromLevel(0.35))).toBeCloseTo(0.35, 9);
    expect(dragCoeffFromLevel(5)).toBe(2);
  });

  it('pointAtTime interpolates between samples', () => {
    const pts = [
      { t: 0, x: 0, y: 0, vx: 1, vy: 1, speed: 1 },
      { t: 2, x: 10, y: 4, vx: 1, vy: 1, speed: 1 },
    ];
    expect(pointAtTime(pts, 1)).toMatchObject({ x: 5, y: 2 });
    expect(pointAtTime(pts, -1).x).toBe(0);
    expect(pointAtTime(pts, 9).x).toBe(10);
  });
});

describe('target hit detection', () => {
  it('point to segment distance', () => {
    expect(pointSegmentDistance(0, 1, -1, 0, 1, 0)).toBe(1);
    expect(pointSegmentDistance(3, 0, -1, 0, 1, 0)).toBe(2);
  });

  it('detects a fly-through of an elevated target (not only the landing point)', () => {
    const shot = simulateIdeal({ velocity: 30, angle: 60 });
    const apex = shot.points.reduce((a, b) => (b.y > a.y ? b : a));
    const result = evaluateShot(shot.points, { x: apex.x, y: apex.y + 0.5, size: 1 });
    expect(result.hit).toBe(true);
    expect(result.missDistance).toBe(0);
    expect(result.accuracy).toBeGreaterThan(0.4);
  });

  it('reports a miss distance measured from the target edge', () => {
    const shot = simulateIdeal({ velocity: 20, angle: 45 });
    const result = evaluateShot(shot.points, { x: shot.range + 10, y: 0, size: 2 });
    expect(result.hit).toBe(false);
    expect(result.missDistance).toBeCloseTo(8, 0);
  });

  it('scores only hits and rewards fewer attempts', () => {
    expect(scoreShot({ hit: false, accuracy: 0 }, 1)).toBe(0);
    expect(scoreShot({ hit: true, accuracy: 1 }, 1)).toBe(100);
    expect(scoreShot({ hit: true, accuracy: 1 }, 3)).toBe(70);
    expect(scoreShot({ hit: true, accuracy: 0 }, 1)).toBe(50);
  });
});
