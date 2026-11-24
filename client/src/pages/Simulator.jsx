import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Controls from '../components/Controls.jsx';
import Graphs from '../components/Graphs.jsx';
import ResultsPanel from '../components/ResultsPanel.jsx';
import RunLegend from '../components/RunLegend.jsx';
import SaveBar from '../components/SaveBar.jsx';
import SimCanvas from '../components/SimCanvas.jsx';
import TargetPanel from '../components/TargetPanel.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { MAX_RUNS, RUN_COLORS } from '../lib/palette.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import { usePlayback } from '../lib/usePlayback.js';
import { DEFAULTS, dragCoeffFromLevel, pointAtTime, simulate, simulateDrag, simulateIdeal } from '../physics/engine.js';
import { DIFFICULTIES, evaluateShot, randomTarget, scoreShot } from '../physics/target.js';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

/** Drag settings forced by each target difficulty. */
function difficultyParams(params, difficulty) {
  if (!DIFFICULTIES[difficulty].drag) return { ...params, airResistanceEnabled: false };
  return { ...params, airResistanceEnabled: true, dragCoeff: difficulty === 'hard' ? dragCoeffFromLevel(0.5) : dragCoeffFromLevel(0.25) };
}

const describe = (p) => `${+p.angle.toFixed(1)}° · ${+p.velocity.toFixed(1)} m/s${p.airResistanceEnabled ? ' · drag' : ''}`;

export default function Simulator() {
  usePageTitle('Simulator', 'Launch projectiles, compare air resistance and play the target game.');
  const { user } = useAuth();
  const [search, setSearch] = useSearchParams();
  const mode = search.get('mode') === 'target' ? 'target' : 'free';
  const loadId = search.get('load');

  const [params, setParams] = useState({ ...DEFAULTS, object: 'ball' });
  const [compare, setCompare] = useState(false);
  const [runs, setRuns] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null);

  const [difficulty, setDifficulty] = useState('easy');
  const [size, setSize] = useState(DIFFICULTIES.easy.radius);
  const [target, setTarget] = useState(() => randomTarget('easy'));
  const [score, setScore] = useState({ attempts: 0, hits: 0, total: 0 });
  const [shot, setShot] = useState(null);

  const counter = useRef(0);
  const pending = useRef(null);
  const pb = usePlayback();
  const { setSpeed: setPlaybackSpeed } = pb;

  useEffect(() => setPlaybackSpeed(speed), [speed, setPlaybackSpeed]);

  const flushPending = useCallback(() => {
    if (pending.current) {
      setShot(pending.current);
      pending.current = null;
    }
  }, []);

  const inTarget = mode === 'target';
  const useCompare = compare && !inTarget;
  const effective = useMemo(
    () => (useCompare ? { ...params, airResistanceEnabled: true } : params),
    [params, useCompare],
  );
  const preview = useMemo(() => (runs.length === 0 ? simulate(effective) : null), [effective, runs.length]);
  const active = runs.find((r) => r.id === activeId) || null;

  // ----- load a saved experiment: /simulator?load=ID -----
  useEffect(() => {
    if (!loadId) return undefined;
    let alive = true;
    setNotice({ kind: 'info', text: `Loading experiment #${loadId}...` });
    api
      .getExperiment(loadId)
      .then(({ data: e }) => {
        if (!alive) return;
        setParams({
          ...DEFAULTS,
          object: e.mass >= 100 && e.angle === 0 ? 'plane' : 'ball',
          angle: e.angle,
          velocity: e.velocity,
          initialHeight: e.initialHeight,
          gravity: e.gravity,
          airResistanceEnabled: e.airResistanceEnabled,
          mass: e.mass,
          dragCoeff: e.dragCoeff,
          area: e.area,
          airDensity: e.airDensity,
        });
        if (e.targetAttempt) {
          const t = e.targetAttempt;
          setTarget({ x: t.targetX, y: t.targetY });
          setSize(t.targetSize);
          setDifficulty(t.difficulty);
        }
        setSearch(e.mode === 'target' ? { mode: 'target' } : {}, { replace: true });
        setNotice({ kind: 'ok', text: `Experiment #${e.id} loaded. Press Launch to run it.` });
      })
      .catch((err) => alive && setNotice({ kind: 'error', text: err.message }));
    return () => {
      alive = false;
    };
  }, [loadId, setSearch]);

  // ----- actions -----
  function launch() {
    flushPending();
    const p = { ...effective };
    const result = useCompare ? simulateDrag(p) : simulate(p);
    const ideal = useCompare ? simulateIdeal(p) : null;
    const number = (counter.current += 1);
    const run = {
      id: number,
      number,
      color: RUN_COLORS[(number - 1) % RUN_COLORS.length],
      label: describe(p),
      params: p,
      result,
      ideal,
      mode,
    };
    if (inTarget) {
      const t = { x: target.x, y: target.y, size };
      const ev = evaluateShot(result.points, t);
      const attemptNo = score.attempts + 1;
      const points = scoreShot(ev, attemptNo);
      run.target = { ...t, difficulty, attempts: attemptNo };
      pending.current = { ...ev, score: points, runId: number };
      setScore((s) => ({ attempts: s.attempts + 1, hits: s.hits + (ev.hit ? 1 : 0), total: s.total + points }));
      setShot(null);
    }
    setRuns((prev) => [...prev, run].slice(-MAX_RUNS));
    setActiveId(number);
    pb.start(result.timeOfFlight, flushPending);
  }

  function reset() {
    flushPending();
    pb.reset();
  }

  function clearTrails() {
    flushPending();
    pb.reset();
    setRuns([]);
    setActiveId(null);
  }

  function removeRun(id) {
    setRuns((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (id === activeId) {
        pb.reset();
        setActiveId(next.length ? next[next.length - 1].id : null);
      }
      return next;
    });
  }

  function setMode(next) {
    if (next === mode) return;
    flushPending();
    pb.reset();
    setSearch(next === 'target' ? { mode: 'target' } : {});
    if (next === 'target') {
      setParams((p) => difficultyParams(p, difficulty));
      setTarget(randomTarget(difficulty));
      setShot(null);
    }
  }

  function changeDifficulty(d) {
    setDifficulty(d);
    setSize(DIFFICULTIES[d].radius);
    setParams((p) => difficultyParams(p, d));
    setTarget(randomTarget(d));
    setShot(null);
    pending.current = null;
  }

  function newTarget() {
    flushPending();
    pending.current = null;
    setTarget(randomTarget(difficulty));
    setShot(null);
    setSize(DIFFICULTIES[difficulty].radius);
    pb.reset();
    setRuns([]);
    setActiveId(null);
  }

  async function saveRun(run, note) {
    const p = run.params;
    await api.createExperiment({
      mode: run.mode,
      angle: p.angle,
      velocity: p.velocity,
      initialHeight: p.initialHeight,
      gravity: p.gravity,
      airResistanceEnabled: p.airResistanceEnabled,
      mass: p.mass,
      dragCoeff: p.dragCoeff,
      area: p.area,
      airDensity: p.airDensity,
      note: note || undefined,
      target: run.target
        ? {
            targetX: run.target.x,
            targetY: run.target.y,
            targetSize: run.target.size,
            difficulty: run.target.difficulty,
            attempts: run.target.attempts,
          }
        : undefined,
    });
    setSavedIds((prev) => new Set(prev).add(run.id));
  }

  const shotRun = shot ? runs.find((r) => r.id === shot.runId) : null;

  // ----- derived view data -----
  const live = active ? pointAtTime(active.result.points, pb.t) : null;
  const scene = {
    runs,
    activeId,
    t: pb.t,
    preview,
    target: inTarget ? { ...target, size } : null,
    angle: params.angle,
    launchHeight: params.initialHeight,
    object: params.object,
  };
  const finished = active && pb.t >= active.result.timeOfFlight;
  const canvasLabel = active
    ? `Trajectory plot. Active run: range ${active.result.range.toFixed(1)} metres, maximum height ${active.result.maxHeight.toFixed(1)} metres.`
    : 'Trajectory plot. No runs yet.';

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{inTarget ? 'Target mode' : 'Simulator'}</h1>
        <div className="tabs" role="group" aria-label="Mode">
          <button className="button button--small button--toggle" aria-pressed={!inTarget} onClick={() => setMode('free')}>
            Free play
          </button>
          <button className="button button--small button--toggle" aria-pressed={inTarget} onClick={() => setMode('target')}>
            Target
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`banner ${notice.kind === 'error' ? 'banner--miss' : notice.kind === 'ok' ? 'banner--hit' : 'banner--info'}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </div>
      )}

      <div className="sim">
        <div className="stack">
          <Controls params={params} onChange={setParams} lockDrag={inTarget} compare={useCompare} />
          {inTarget && (
            <TargetPanel
              difficulty={difficulty}
              onDifficulty={changeDifficulty}
              target={target}
              size={size}
              onSize={setSize}
              onNewTarget={newTarget}
              score={score}
              shot={shot}
              user={user}
              saved={shotRun ? savedIds.has(shotRun.id) : false}
              onSaveShot={() => saveRun(shotRun, '')}
              onResetScore={() => setScore({ attempts: 0, hits: 0, total: 0 })}
            />
          )}
        </div>

        <div className="stack">
          <section className="panel stage" aria-label="Simulation stage">
            <SimCanvas scene={scene} label={canvasLabel} />
            <div className="stage__scan" aria-hidden="true" />
            <div className="stage__hud" aria-label="Live readout">
              <span>
                <span
                  className={`status-dot ${pb.playing ? '' : 'status-dot--idle'}`}
                  aria-hidden="true"
                  style={{ width: '0.5rem', height: '0.5rem', marginRight: '0.4rem' }}
                />
                {pb.playing ? 'TRACKING' : finished ? 'LANDED' : 'STANDBY'}
              </span>
              <span>
                t <b>{(live?.t ?? 0).toFixed(2)}</b> s
              </span>
              <span>
                x <b>{(live?.x ?? 0).toFixed(2)}</b> m
              </span>
              <span>
                y <b>{(live?.y ?? params.initialHeight).toFixed(2)}</b> m
              </span>
              <span>
                v <b>{(live?.speed ?? params.velocity).toFixed(2)}</b> m/s
              </span>
            </div>
            <div className="toolbar row">
              <button className="button button--primary" onClick={launch}>
                Launch
              </button>
              <button
                className="button"
                onClick={pb.playing ? pb.pause : pb.resume}
                disabled={!active || finished}
              >
                {pb.playing ? 'Pause' : 'Resume'}
              </button>
              <button className="button" onClick={reset} disabled={!active}>
                Reset
              </button>
              <button className="button" onClick={clearTrails} disabled={!runs.length}>
                Clear trails
              </button>
              {!inTarget && (
                <button
                  className="button button--toggle"
                  aria-pressed={compare}
                  onClick={() => setCompare((c) => !c)}
                  title="Overlay the ideal (no drag) trajectory on the drag trajectory"
                >
                  Compare
                </button>
              )}
              <label className="row" style={{ marginLeft: 'auto', gap: '0.5rem' }}>
                <span className="label">Speed</span>
                <select
                  className="select"
                  style={{ width: '5.5rem' }}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}x
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <ResultsPanel run={active} />
          <RunLegend runs={runs} activeId={activeId} onSelect={setActiveId} onRemove={removeRun} />
          {!inTarget && <SaveBar user={user} run={active} saved={active ? savedIds.has(active.id) : false} onSave={saveRun} />}
        </div>
      </div>

      <Graphs runs={runs} />
    </div>
  );
}
