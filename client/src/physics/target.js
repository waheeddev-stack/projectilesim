/**
 * Target-hit mode helpers (pure functions, shared by client and server).
 *
 * The target is a circle of radius `size` centred at (x, y). A shot is a hit
 * when ANY segment of the sampled trajectory passes within `size` of the
 * centre - not just the landing point - so shots that fly through an
 * elevated target count.
 */

export const DIFFICULTIES = {
  easy: { label: 'Easy', radius: 4, drag: false, minDistance: 20, maxDistance: 60, maxHeight: 0 },
  medium: { label: 'Medium', radius: 2.5, drag: true, minDistance: 30, maxDistance: 90, maxHeight: 8 },
  hard: { label: 'Hard', radius: 1.5, drag: true, minDistance: 40, maxDistance: 120, maxHeight: 20 },
};

/** Shortest distance from point (px, py) to the segment (ax, ay)-(bx, by). */
export function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let f = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  f = Math.max(0, Math.min(1, f));
  return Math.hypot(px - (ax + f * dx), py - (ay + f * dy));
}

/**
 * Evaluate a shot against a target.
 * @param {Array<{x:number,y:number}>} points trajectory samples
 * @param {{x:number,y:number,size:number}} target
 * @returns {{hit:boolean, minDistance:number, missDistance:number, accuracy:number}}
 *   minDistance - closest approach to the target centre
 *   missDistance - how far outside the target edge the path stayed (0 on a hit)
 *   accuracy - 1 for a dead-centre hit, 0 at the edge or on a miss
 */
export function evaluateShot(points, target) {
  let minDistance = Infinity;
  if (points.length === 1) {
    minDistance = Math.hypot(points[0].x - target.x, points[0].y - target.y);
  }
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    minDistance = Math.min(minDistance, pointSegmentDistance(target.x, target.y, a.x, a.y, b.x, b.y));
  }
  const hit = minDistance <= target.size;
  return {
    hit,
    minDistance,
    missDistance: hit ? 0 : minDistance - target.size,
    accuracy: hit ? 1 - minDistance / target.size : 0,
  };
}

/**
 * Score for a shot: only hits score. Perfect accuracy on the first attempt
 * gives 100 points; each extra attempt costs 15 points (floor of 10), and the
 * accuracy scales the result between 50% and 100%.
 */
export function scoreShot({ hit, accuracy }, attempts) {
  if (!hit) return 0;
  const base = Math.max(10, 100 - 15 * (Math.max(1, attempts) - 1));
  return Math.round(base * (0.5 + 0.5 * accuracy));
}

/** Pick a random target for a difficulty. `rand` is injectable for tests. */
export function randomTarget(difficulty = 'easy', rand = Math.random) {
  const d = DIFFICULTIES[difficulty] || DIFFICULTIES.easy;
  const x = d.minDistance + rand() * (d.maxDistance - d.minDistance);
  const y = d.maxHeight > 0 ? rand() * d.maxHeight : 0;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size: d.radius };
}
