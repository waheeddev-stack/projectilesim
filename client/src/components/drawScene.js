// Canvas drawing for the simulator. Pure function of (ctx, size, scene).
import { pointAtTime } from '../physics/engine.js';
import { COLORS } from '../lib/palette.js';

const MARGIN = { left: 52, right: 18, top: 18, bottom: 34 };

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

/** World bounds (metres) that contain everything we want on screen. */
export function computeBounds({ runs, preview, target }) {
  let xMax = 10;
  let yMax = 5;
  const take = (points) => {
    for (const p of points) {
      if (p.x > xMax) xMax = p.x;
      if (p.y > yMax) yMax = p.y;
    }
  };
  runs.forEach((r) => {
    take(r.result.points);
    if (r.ideal) take(r.ideal.points);
  });
  if (preview) take(preview.points);
  if (target) {
    xMax = Math.max(xMax, target.x + target.size * 1.5);
    yMax = Math.max(yMax, target.y + target.size * 1.5);
  }
  return { xMax: xMax * 1.08, yMax: yMax * 1.15 };
}

/** Line-art aircraft centred on (x, y). `angle` is the canvas rotation (nose direction, radians). */
function drawPlane(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.fillStyle = COLORS.bg;
  ctx.lineWidth = 1.6;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(22, 0); // nose
  ctx.quadraticCurveTo(14, -5, 2, -5); // top of fuselage
  ctx.lineTo(-18, -4);
  ctx.lineTo(-24, -14); // tail fin
  ctx.lineTo(-18, -14);
  ctx.lineTo(-12, -4);
  ctx.lineTo(-22, 0); // tail end
  ctx.lineTo(-12, 4);
  ctx.lineTo(2, 5); // belly
  ctx.quadraticCurveTo(14, 5, 22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath(); // wings
  ctx.moveTo(4, 1);
  ctx.lineTo(-8, 15);
  ctx.lineTo(-13, 15);
  ctx.lineTo(-8, 1);
  ctx.moveTo(4, -1);
  ctx.lineTo(-8, -9);
  ctx.lineTo(-13, -9);
  ctx.lineTo(-8, -1);
  ctx.stroke();
  ctx.restore();
}

export function drawScene(ctx, width, height, scene) {
  const { runs, activeId, t, preview, target, angle } = scene;
  ctx.clearRect(0, 0, width, height);

  const { xMax, yMax } = computeBounds(scene);
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  // Same scale on both axes so trajectories keep their true shape.
  const scale = Math.max(0.0001, Math.min(plotW / xMax, plotH / yMax));
  const groundY = height - MARGIN.bottom;
  const sx = (x) => MARGIN.left + x * scale;
  const sy = (y) => groundY - y * scale;

  // Grid + axes
  const step = niceStep(60 / scale);
  ctx.font = '11px ui-monospace, Consolas, monospace';
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let x = 0; x * scale <= plotW + 1; x += step) {
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(sx(x) + 0.5, MARGIN.top);
    ctx.lineTo(sx(x) + 0.5, groundY);
    ctx.stroke();
    ctx.fillText(String(+x.toFixed(2)), sx(x), groundY + 6);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = 0; y * scale <= plotH + 1; y += step) {
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, sy(y) + 0.5);
    ctx.lineTo(width - MARGIN.right, sy(y) + 0.5);
    ctx.stroke();
    ctx.fillText(String(+y.toFixed(2)), MARGIN.left - 8, sy(y));
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('m', width - MARGIN.right, groundY - 4);

  // Ground + axes
  ctx.strokeStyle = COLORS.cyan;
  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, groundY + 0.5);
  ctx.lineTo(width - MARGIN.right, groundY + 0.5);
  ctx.moveTo(MARGIN.left + 0.5, MARGIN.top);
  ctx.lineTo(MARGIN.left + 0.5, groundY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const path = (points, upToT = Infinity) => {
    ctx.beginPath();
    let started = false;
    for (const p of points) {
      if (p.t > upToT) break;
      if (!started) {
        ctx.moveTo(sx(p.x), sy(p.y));
        started = true;
      } else ctx.lineTo(sx(p.x), sy(p.y));
    }
    if (upToT !== Infinity) {
      const cur = pointAtTime(points, upToT);
      if (cur) ctx.lineTo(sx(cur.x), sy(cur.y));
    }
    ctx.stroke();
  };

  // Live preview of the current settings (dim dashed line)
  if (preview && runs.length === 0) {
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(0,255,255,0.35)';
    ctx.lineWidth = 1;
    path(preview.points);
    ctx.setLineDash([]);
  }

  // Target
  if (target) {
    const cx = sx(target.x);
    const cy = sy(target.y);
    const r = target.size * scale;
    ctx.strokeStyle = COLORS.alert;
    ctx.shadowColor = COLORS.alert;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.moveTo(cx - r * 1.4, cy);
    ctx.lineTo(cx + r * 1.4, cy);
    ctx.moveTo(cx, cy - r * 1.4);
    ctx.lineTo(cx, cy + r * 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.5, r * 0.35), 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Runs
  for (const run of runs) {
    const active = run.id === activeId;
    if (run.ideal) {
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = run.color;
      ctx.globalAlpha = 0.55;
      path(run.ideal.points);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    if (!active) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = run.color;
      ctx.globalAlpha = 0.6;
      path(run.result.points);
      ctx.globalAlpha = 1;
    } else {
      // Faint full path, bright trail up to the projectile.
      ctx.lineWidth = 1;
      ctx.strokeStyle = run.color;
      ctx.globalAlpha = 0.22;
      path(run.result.points);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = run.color;
      ctx.shadowBlur = 10;
      path(run.result.points, t);
      ctx.shadowBlur = 0;
    }
  }

  // Launcher at the origin (barrel follows the current angle, or a plane for the drop preset)
  const l0 = scene.launchHeight || 0;
  const ox = sx(0);
  const oy = sy(l0);
  const rad = ((angle ?? 45) * Math.PI) / 180;
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 3;
  if (scene.object === 'plane') {
    // Before launch the plane waits at the launch point, nose along the launch angle.
    if (!runs.some((r) => r.id === activeId)) drawPlane(ctx, ox, oy, -rad, COLORS.cyan);
  } else {
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(rad) * 26, oy - Math.sin(rad) * 26);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  if (l0 > 0) {
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, groundY);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(ox, oy, 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();
  ctx.stroke();

  // Projectile
  const active = runs.find((r) => r.id === activeId);
  if (active) {
    const p = pointAtTime(active.result.points, t);
    if (p && active.params.object === 'plane') {
      // The plane itself is the projectile: nose follows the velocity vector.
      drawPlane(ctx, sx(p.x), sy(p.y), Math.atan2(-p.vy, p.vx), active.color);
    } else if (p) {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = active.color;
      ctx.shadowBlur = 16;
      // Heavy objects are drawn bigger (radius grows slowly with mass).
      const pr = active.params.mass >= 100 ? 8 : active.params.mass >= 1 ? 6.5 : 5;
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = active.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
