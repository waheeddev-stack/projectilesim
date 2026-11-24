const f = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '-');

function Result({ label, unit, value, ideal }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="readout readout--sm">
        {value} <small>{unit}</small>
      </div>
      {ideal !== undefined && (
        <div className="result__ideal">
          ideal {ideal} {unit}
        </div>
      )}
    </div>
  );
}

/** Max height, range, time of flight (and ideal values when compare mode is on). */
export default function ResultsPanel({ run }) {
  if (!run) {
    return (
      <section className="panel panel--compact" aria-labelledby="results-title">
        <h2 id="results-title">Results</h2>
        <p className="text-dim" style={{ margin: 0 }}>
          Press Launch to run the simulation. Results appear here.
        </p>
      </section>
    );
  }
  const { result, ideal } = run;
  return (
    <section className="panel panel--compact" aria-labelledby="results-title">
      <h2 id="results-title">
        Results <span className="text-dim">// {run.label}</span>
      </h2>
      <div className="results">
        <Result label="Max height" unit="m" value={f(result.maxHeight)} ideal={ideal ? f(ideal.maxHeight) : undefined} />
        <Result label="Range" unit="m" value={f(result.range)} ideal={ideal ? f(ideal.range) : undefined} />
        <Result label="Time of flight" unit="s" value={f(result.timeOfFlight)} ideal={ideal ? f(ideal.timeOfFlight) : undefined} />
        <Result label="Impact speed" unit="m/s" value={f(result.impactSpeed)} ideal={ideal ? f(ideal.impactSpeed) : undefined} />
        <Result label="Impact angle" unit="deg" value={f(result.impactAngle, 1)} ideal={ideal ? f(ideal.impactAngle, 1) : undefined} />
      </div>
    </section>
  );
}
