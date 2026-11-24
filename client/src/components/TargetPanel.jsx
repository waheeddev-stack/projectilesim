import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DIFFICULTIES } from '../physics/target.js';
import Field from './Field.jsx';

/** Target mode: difficulty, size, score keeping, result banner, save. */
export default function TargetPanel({
  difficulty,
  onDifficulty,
  target,
  size,
  onSize,
  onNewTarget,
  score,
  shot,
  user,
  saved,
  onSaveShot,
  onResetScore,
}) {
  const [error, setError] = useState('');
  const accuracy = score.attempts ? Math.round((score.hits / score.attempts) * 100) : 0;

  async function save() {
    setError('');
    try {
      await onSaveShot();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel" aria-labelledby="target-title">
      <h2 id="target-title">Target mode</h2>

      <div className="label" id="difficulty-label">
        Difficulty
      </div>
      <div className="tabs" role="group" aria-labelledby="difficulty-label" style={{ margin: '0.4rem 0 1rem' }}>
        {Object.entries(DIFFICULTIES).map(([key, d]) => (
          <button
            key={key}
            className="button button--small button--toggle"
            aria-pressed={difficulty === key}
            onClick={() => onDifficulty(key)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="text-dim" style={{ fontSize: '0.85rem' }}>
        {DIFFICULTIES[difficulty].drag ? 'Air resistance on.' : 'No air resistance.'} Target at x ={' '}
        <b>{target.x.toFixed(1)} m</b>, y = <b>{target.y.toFixed(1)} m</b>.
      </p>

      <Field label="Target radius" unit="m" value={size} min={0.5} max={10} step={0.1} onChange={onSize} />

      <div className="stat-grid">
        <div>
          <div className="label">Attempts</div>
          <div className="readout readout--sm">{score.attempts}</div>
        </div>
        <div>
          <div className="label">Hits</div>
          <div className="readout readout--sm">
            {score.hits} <small>({accuracy}%)</small>
          </div>
        </div>
        <div>
          <div className="label">Score</div>
          <div className="readout readout--sm">{score.total}</div>
        </div>
      </div>

      <div aria-live="polite">
        {shot ? (
          <div className={`banner ${shot.hit ? 'banner--hit' : 'banner--miss'}`} role="status">
            <span className={`status-dot ${shot.hit ? 'status-dot--ok' : 'status-dot--alert'}`} aria-hidden="true" />
            <b>
              {shot.hit
                ? `HIT! +${shot.score} points (accuracy ${Math.round(shot.accuracy * 100)}%)`
                : `MISS by ${shot.missDistance.toFixed(2)} m`}
            </b>
          </div>
        ) : (
          <div className="banner banner--info">Set angle and velocity, then launch at the target.</div>
        )}
      </div>

      <div className="row" style={{ marginTop: '1rem' }}>
        <button className="button button--primary" onClick={onNewTarget}>
          New target
        </button>
        {shot &&
          (user ? (
            <button className="button" onClick={save} disabled={saved}>
              {saved ? 'Result saved' : 'Save result'}
            </button>
          ) : (
            <span className="text-dim">
              <Link to="/login">Log in</Link> to save results
            </span>
          ))}
        <button className="button button--small" onClick={onResetScore} disabled={!score.attempts}>
          Reset score
        </button>
      </div>
      {error && (
        <p className="field__error" role="alert" style={{ marginTop: '0.6rem' }}>
          {error}
        </p>
      )}
    </section>
  );
}
