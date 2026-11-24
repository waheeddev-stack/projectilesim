import { memo, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLORS } from '../lib/palette.js';

const MAX_POINTS = 150;

function downsample(points) {
  if (points.length <= MAX_POINTS) return points;
  const stride = (points.length - 1) / (MAX_POINTS - 1);
  const out = [];
  for (let i = 0; i < MAX_POINTS; i += 1) out.push(points[Math.round(i * stride)]);
  return out;
}

const round = (n) => Math.round(n * 1000) / 1000;

function Chart({ title, series, xKey, yKey, xLabel, yLabel }) {
  return (
    <section className="panel panel--compact" aria-label={title}>
      <h3 className="chart__title">{title}</h3>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 6, right: 12, bottom: 18, left: 0 }}>
            <CartesianGrid stroke={COLORS.grid} />
            <XAxis
              type="number"
              dataKey={xKey}
              domain={[0, 'auto']}
              stroke={COLORS.line}
              tick={{ fill: COLORS.text, fontSize: 11 }}
              label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: COLORS.text, fontSize: 11 }}
              tickFormatter={round}
            />
            <YAxis
              type="number"
              stroke={COLORS.line}
              tick={{ fill: COLORS.text, fontSize: 11 }}
              width={48}
              tickFormatter={round}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: COLORS.text, fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.line}`, color: COLORS.cyan, fontSize: 12 }}
              labelStyle={{ display: 'none' }}
              formatter={(v, name) => [round(v), name]}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                data={s.data}
                dataKey={yKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                dot={false}
                isAnimationActive={false}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/** y-x path, height-time and speed-time graphs (optionally vx/vy) for all runs. */
function Graphs({ runs }) {
  const [components, setComponents] = useState(false);

  const series = useMemo(
    () =>
      runs.flatMap((r) => {
        const out = [{ key: `${r.id}`, name: `#${r.number}`, color: r.color, data: downsample(r.result.points) }];
        if (r.ideal) {
          out.push({ key: `${r.id}-i`, name: `#${r.number} ideal`, color: r.color, dashed: true, data: downsample(r.ideal.points) });
        }
        return out;
      }),
    [runs],
  );

  // vx and vy get distinct dash styles, drawn per run.
  const vSeries = useMemo(
    () =>
      runs.flatMap((r) => {
        const data = downsample(r.result.points);
        return [
          { key: `${r.id}-vx`, name: `#${r.number} vx`, color: r.color, data, yKey: 'vx' },
          { key: `${r.id}-vy`, name: `#${r.number} vy`, color: r.color, data, yKey: 'vy', dashed: true },
        ];
      }),
    [runs],
  );

  if (!runs.length) {
    return (
      <section className="panel panel--compact">
        <h2>Graphs</h2>
        <p className="text-dim" style={{ margin: 0 }}>
          Graphs appear after your first launch.
        </p>
      </section>
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Graphs</h2>
        <label className="check">
          <input type="checkbox" checked={components} onChange={(e) => setComponents(e.target.checked)} />
          Show vx / vy
        </label>
      </div>
      <div className="grid-2">
        <Chart title="Path: height vs distance" series={series} xKey="x" yKey="y" xLabel="x (m)" yLabel="y (m)" />
        <Chart title="Height vs time" series={series} xKey="t" yKey="y" xLabel="t (s)" yLabel="y (m)" />
        <Chart title="Speed vs time" series={series} xKey="t" yKey="speed" xLabel="t (s)" yLabel="speed (m/s)" />
        {components && (
          <section className="panel panel--compact" aria-label="Velocity components">
            <h3 className="chart__title">vx (solid) and vy (dashed) vs time</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 6, right: 12, bottom: 18, left: 0 }}>
                  <CartesianGrid stroke={COLORS.grid} />
                  <XAxis type="number" dataKey="t" domain={[0, 'auto']} stroke={COLORS.line} tick={{ fill: COLORS.text, fontSize: 11 }} tickFormatter={round} label={{ value: 't (s)', position: 'insideBottom', offset: -10, fill: COLORS.text, fontSize: 11 }} />
                  <YAxis type="number" stroke={COLORS.line} tick={{ fill: COLORS.text, fontSize: 11 }} width={48} tickFormatter={round} />
                  <Tooltip contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.line}`, color: COLORS.cyan, fontSize: 12 }} labelStyle={{ display: 'none' }} formatter={(v, name) => [round(v), name]} />
                  {vSeries.map((s) => (
                    <Line key={s.key} data={s.data} dataKey={s.yKey} name={s.name} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} dot={false} isAnimationActive={false} type="monotone" />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default memo(Graphs);
