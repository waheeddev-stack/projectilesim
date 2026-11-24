/**
 * Projectile motion physics engine.
 *
 * Pure, framework-free module: no DOM, no React, no Node-only APIs. It is
 * imported by the browser (canvas + graphs), by the API route handlers (to
 * recompute results server-side) and by the unit tests.
 *
 * Coordinate system: x is horizontal distance (m), y is height above the
 * ground (m). The ground is y = 0. Time is in seconds, angles in degrees.
 *
 * Two models are provided:
 *   1. Ideal (no air resistance) - closed-form equations.
 *   2. Quadratic drag - RK4 numerical integration of
 *        ax = -k * v * vx
 *        ay = -g - k * v * vy          with v = sqrt(vx^2 + vy^2)
 *      where k = 0.5 * rho * Cd * A / m  (units: 1/m).
 */

export const GRAVITY_PRESETS = {
  Earth: 9.81,
  Moon: 1.62,
  Mars: 3.71,
  Jupiter: 24.79,
};

/** Allowed ranges - every input is clamped into these. */
export const LIMITS = {
  velocity: { min: 0, max: 200 },
  angle: { min: 0, max: 90 },
  initialHeight: { min: 0, max: 1000 },
  gravity: { min: 0.1, max: 30 },
  mass: { min: 0.01, max: 1000 },
  dragCoeff: { min: 0, max: 5 },
  area: { min: 0.0001, max: 10 },
  airDensity: { min: 0, max: 20 },
};

export const DEFAULTS = {
  velocity: 20,
  angle: 45,
  initialHeight: 0,
  gravity: 9.81,
  airResistanceEnabled: false,
  mass: 0.145, // baseball
  dragCoeff: 0.47, // sphere
  area: 0.0043, // m^2 - cross-section of a baseball
  airDensity: 1.225, // kg/m^3 at sea level
};

/** Cd value that corresponds to 100% on the beginner "air resistance level" slider. */
export const MAX_LEVEL_DRAG_COEFF = 2;

const DEG = Math.PI / 180;
const BASE_DT = 0.002; // RK4 step (s)
const MAX_STEPS = 400000; // hard cap on integration steps
const TARGET_SAMPLES = 1500; // approximate number of stored points

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function num(value, fallback) {
  const n = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Validate and clamp user parameters. Always returns a complete, sane object.
 * @param {object} [input]
 */
export function normalizeParams(input = {}) {
  const p = { ...DEFAULTS, ...input };
  return {
    velocity: clamp(num(p.velocity, DEFAULTS.velocity), LIMITS.velocity.min, LIMITS.velocity.max),
    angle: clamp(num(p.angle, DEFAULTS.angle), LIMITS.angle.min, LIMITS.angle.max),
    initialHeight: clamp(
      num(p.initialHeight, DEFAULTS.initialHeight),
      LIMITS.initialHeight.min,
      LIMITS.initialHeight.max,
    ),
    gravity: clamp(num(p.gravity, DEFAULTS.gravity), LIMITS.gravity.min, LIMITS.gravity.max),
    airResistanceEnabled: Boolean(p.airResistanceEnabled),
    mass: clamp(num(p.mass, DEFAULTS.mass), LIMITS.mass.min, LIMITS.mass.max),
    dragCoeff: clamp(num(p.dragCoeff, DEFAULTS.dragCoeff), LIMITS.dragCoeff.min, LIMITS.dragCoeff.max),
    area: clamp(num(p.area, DEFAULTS.area), LIMITS.area.min, LIMITS.area.max),
    airDensity: clamp(
      num(p.airDensity, DEFAULTS.airDensity),
      LIMITS.airDensity.min,
      LIMITS.airDensity.max,
    ),
    // Optional explicit override of the drag constant (used by tests / advanced callers).
    ...(p.dragK !== undefined && Number.isFinite(Number(p.dragK))
      ? { dragK: Math.max(0, Number(p.dragK)) }
      : {}),
  };
}

/** Drag constant k = 0.5 * rho * Cd * A / m  (1/m). */
export function dragConstant({ airDensity, dragCoeff, area, mass }) {
  return (0.5 * airDensity * dragCoeff * area) / mass;
}

/** Beginner slider (0..1) -> drag coefficient. */
export function dragCoeffFromLevel(level) {
  return clamp(num(level, 0), 0, 1) * MAX_LEVEL_DRAG_COEFF;
}

/** Drag coefficient -> beginner slider (0..1). */
export function levelFromDragCoeff(dragCoeff) {
  return clamp(num(dragCoeff, 0) / MAX_LEVEL_DRAG_COEFF, 0, 1);
}

function launchVelocity(velocity, angle) {
  // Special-case 90 degrees so cos is exactly 0 (Math.cos(pi/2) = 6e-17).
  const vx = angle >= 90 ? 0 : velocity * Math.cos(angle * DEG);
  const vy = velocity * Math.sin(angle * DEG);
  return { vx, vy };
}

function emptyResult(h0, vx, vy) {
  const point = { t: 0, x: 0, y: h0, vx, vy, speed: Math.hypot(vx, vy) };
  return {
    points: [point],
    maxHeight: h0,
    range: 0,
    timeOfFlight: 0,
    apexTime: 0,
    impactSpeed: point.speed,
    impactAngle: 0,
  };
}

/**
 * Closed-form trajectory with no air resistance.
 * @param {object} params normalised parameters
 */
export function simulateIdeal(params) {
  const { velocity: v0, angle, initialHeight: h0, gravity: g } = normalizeParams(params);
  const { vx, vy } = launchVelocity(v0, angle);

  // Time of flight: positive root of h0 + vy*t - g*t^2/2 = 0
  const timeOfFlight = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
  if (!(timeOfFlight > 0)) return emptyResult(h0, vx, vy);

  const apexTime = vy > 0 ? vy / g : 0;
  const maxHeight = h0 + (vy > 0 ? (vy * vy) / (2 * g) : 0);

  const n = clamp(Math.ceil(timeOfFlight / 0.02), 40, 3000);
  const points = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i === n ? timeOfFlight : (i / n) * timeOfFlight;
    const vyT = vy - g * t;
    points.push({
      t,
      x: vx * t,
      y: i === n ? 0 : Math.max(0, h0 + vy * t - 0.5 * g * t * t),
      vx,
      vy: vyT,
      speed: Math.hypot(vx, vyT),
    });
  }

  const last = points[points.length - 1];
  return {
    points,
    maxHeight,
    range: last.x,
    timeOfFlight,
    apexTime,
    impactSpeed: last.speed,
    impactAngle: Math.atan2(-last.vy, Math.abs(last.vx)) / DEG,
  };
}

/** Derivative of the state [x, y, vx, vy] under gravity + quadratic drag. */
function deriv(s, g, k) {
  const speed = Math.hypot(s[2], s[3]);
  return [s[2], s[3], -k * speed * s[2], -g - k * speed * s[3]];
}

function rk4Step(s, dt, g, k) {
  const k1 = deriv(s, g, k);
  const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]);
  const k2 = deriv(s2, g, k);
  const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]);
  const k3 = deriv(s3, g, k);
  const s4 = s.map((v, i) => v + dt * k3[i]);
  const k4 = deriv(s4, g, k);
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * Numerical trajectory with quadratic air drag (RK4).
 * The landing point is found by linear interpolation between the last step
 * above ground and the first step below it.
 */
export function simulateDrag(params) {
  const p = normalizeParams(params);
  const { velocity: v0, angle, initialHeight: h0, gravity: g } = p;
  const k = p.dragK !== undefined ? p.dragK : dragConstant(p);
  const { vx, vy } = launchVelocity(v0, angle);

  // Upper bound for the flight time (drag only shortens it) -> picks a safe dt.
  const tMax = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
  if (!(tMax > 0)) return emptyResult(h0, vx, vy);
  const dt = Math.max(BASE_DT, tMax / MAX_STEPS);
  const stride = Math.max(1, Math.round(tMax / dt / TARGET_SAMPLES));

  let state = [0, h0, vx, vy];
  let t = 0;
  let step = 0;
  let maxHeight = h0;
  let apexTime = 0;
  const points = [{ t: 0, x: 0, y: h0, vx, vy, speed: Math.hypot(vx, vy) }];
  let landed = null;

  while (step < MAX_STEPS * 2) {
    const next = rk4Step(state, dt, g, k);
    step += 1;
    if (next[1] <= 0) {
      // Linear interpolation of the exact landing point.
      const frac = state[1] / (state[1] - next[1]);
      const tl = t + frac * dt;
      const lerp = (a, b) => a + frac * (b - a);
      landed = {
        t: tl,
        x: lerp(state[0], next[0]),
        y: 0,
        vx: lerp(state[2], next[2]),
        vy: lerp(state[3], next[3]),
      };
      landed.speed = Math.hypot(landed.vx, landed.vy);
      break;
    }
    state = next;
    t += dt;
    if (state[1] > maxHeight) {
      maxHeight = state[1];
      apexTime = t;
    }
    if (step % stride === 0) {
      points.push({
        t,
        x: state[0],
        y: state[1],
        vx: state[2],
        vy: state[3],
        speed: Math.hypot(state[2], state[3]),
      });
    }
  }

  if (!landed) {
    // Should be unreachable; fall back to the last known state.
    landed = { t, x: state[0], y: 0, vx: state[2], vy: state[3], speed: Math.hypot(state[2], state[3]) };
  }
  points.push(landed);

  return {
    points,
    maxHeight,
    range: landed.x,
    timeOfFlight: landed.t,
    apexTime,
    impactSpeed: landed.speed,
    impactAngle: Math.atan2(-landed.vy, Math.abs(landed.vx)) / DEG,
  };
}

/**
 * Main entry point. Uses the drag model when `airResistanceEnabled` is true,
 * otherwise the closed-form solution.
 * @returns {{points: Array, maxHeight:number, range:number, timeOfFlight:number,
 *   apexTime:number, impactSpeed:number, impactAngle:number}}
 */
export function simulate(params) {
  const p = normalizeParams(params);
  return p.airResistanceEnabled ? simulateDrag(p) : simulateIdeal(p);
}

/**
 * Compare mode: the ideal and drag trajectories for the same launch.
 */
export function compare(params) {
  const p = normalizeParams(params);
  return { ideal: simulateIdeal(p), drag: simulateDrag(p) };
}

/** Linear interpolation of a sampled trajectory at time t (clamped to its ends). */
export function pointAtTime(points, t) {
  if (!points.length) return null;
  if (t <= points[0].t) return points[0];
  const last = points[points.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const f = (t - a.t) / (b.t - a.t || 1);
  const mix = (key) => a[key] + f * (b[key] - a[key]);
  return { t, x: mix('x'), y: mix('y'), vx: mix('vx'), vy: mix('vy'), speed: mix('speed') };
}
