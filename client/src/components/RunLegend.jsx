/** Legend for runs on the canvas, with a button to remove each one. */
export default function RunLegend({ runs, activeId, onSelect, onRemove }) {
  if (!runs.length) return null;
  return (
    <section className="panel panel--compact" aria-labelledby="legend-title">
      <h2 id="legend-title">Runs</h2>
      <ul className="legend">
        {runs.map((run) => (
          <li key={run.id} className="legend__item" data-active={run.id === activeId} style={{ color: run.color }}>
            <span className="legend__swatch" aria-hidden="true" />
            <button
              className="button button--small"
              style={{ borderColor: 'transparent', background: 'transparent', color: 'inherit', padding: '0.1rem 0.3rem' }}
              onClick={() => onSelect(run.id)}
              aria-pressed={run.id === activeId}
              title="Show results for this run"
            >
              #{run.number} {run.label}
            </button>
            {run.ideal && (
              <span title="Dashed line = ideal (no drag)" className="legend__dash" aria-label="with ideal overlay" />
            )}
            <button
              className="button button--small button--danger"
              aria-label={`Remove run ${run.number}`}
              onClick={() => onRemove(run.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
