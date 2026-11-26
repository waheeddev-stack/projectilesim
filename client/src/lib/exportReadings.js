// Turns saved experiments and on-screen runs into worksheet rows.

const round = (n, d = 4) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);

const PARAM_HEADERS = [
  'Angle (deg)',
  'Velocity (m/s)',
  'Initial height (m)',
  'Gravity (m/s2)',
  'Air resistance',
  'Mass (kg)',
  'Drag coefficient',
  'Area (m2)',
  'Air density (kg/m3)',
];

const paramCells = (p) => [
  p.angle,
  p.velocity,
  p.initialHeight,
  p.gravity,
  p.airResistanceEnabled ? 'on' : 'off',
  p.mass,
  p.dragCoeff,
  p.area,
  p.airDensity,
];

/** One sheet with every saved experiment (as returned by the API). */
export function experimentSheets(experiments) {
  const header = [
    'ID',
    'Date',
    'Mode',
    ...PARAM_HEADERS,
    'Max height (m)',
    'Range (m)',
    'Time of flight (s)',
    'Difficulty',
    'Target x (m)',
    'Target y (m)',
    'Target radius (m)',
    'Hit',
    'Miss distance (m)',
    'Score',
    'Note',
  ];
  const rows = experiments.map((e) => {
    const t = e.targetAttempt;
    return [
      e.id,
      new Date(e.createdAt).toLocaleString(),
      e.mode,
      ...paramCells(e),
      round(e.maxHeight),
      round(e.range),
      round(e.timeOfFlight),
      t?.difficulty,
      t?.targetX,
      t?.targetY,
      t?.targetSize,
      t ? (t.hit ? 'yes' : 'no') : null,
      t ? round(t.missDistance) : null,
      t?.score,
      e.note,
    ];
  });
  return [{ name: 'Experiments', rows: [header, ...rows] }];
}

const trajectoryRows = (points) => [
  ['t (s)', 'x (m)', 'y (m)', 'vx (m/s)', 'vy (m/s)', 'speed (m/s)'],
  ...points.map((p) => [round(p.t), round(p.x), round(p.y), round(p.vx), round(p.vy), round(p.speed)]),
];

/** A summary sheet plus the full time series of every run on the canvas. */
export function runSheets(runs) {
  const header = [
    'Run',
    'Model',
    ...PARAM_HEADERS,
    'Max height (m)',
    'Range (m)',
    'Time of flight (s)',
    'Apex time (s)',
    'Impact speed (m/s)',
    'Impact angle (deg)',
  ];
  const summaryRow = (run, model, params, r) => [
    run.number,
    model,
    ...paramCells(params),
    round(r.maxHeight),
    round(r.range),
    round(r.timeOfFlight),
    round(r.apexTime),
    round(r.impactSpeed),
    round(r.impactAngle),
  ];

  const summary = [header];
  const readings = [];
  for (const run of runs) {
    summary.push(summaryRow(run, run.params.airResistanceEnabled ? 'drag' : 'ideal', run.params, run.result));
    readings.push({ name: `Run ${run.number}`, rows: trajectoryRows(run.result.points) });
    if (run.ideal) {
      summary.push(summaryRow(run, 'ideal', { ...run.params, airResistanceEnabled: false }, run.ideal));
      readings.push({ name: `Run ${run.number} ideal`, rows: trajectoryRows(run.ideal.points) });
    }
  }
  return [{ name: 'Summary', rows: summary }, ...readings];
}

export const exportFileName = (prefix) => `${prefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
