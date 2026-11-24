import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { api } from '../lib/api.js';
import { usePageTitle } from '../lib/usePageTitle.js';

const PAGE_SIZE = 8;
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '-');

function StatsStrip({ stats }) {
  if (!stats) return null;
  return (
    <section className="panel panel--compact results" aria-label="Your statistics">
      <div>
        <div className="label">Total runs</div>
        <div className="readout readout--sm">{stats.totalRuns}</div>
      </div>
      <div>
        <div className="label">Target hits</div>
        <div className="readout readout--sm">
          {stats.hits}/{stats.attempts}
        </div>
      </div>
      <div>
        <div className="label">Best score</div>
        <div className="readout readout--sm">{stats.bestScore}</div>
      </div>
      <div>
        <div className="label">Avg range</div>
        <div className="readout readout--sm">
          {fmt(stats.averageRange)} <small>m</small>
        </div>
      </div>
      <div>
        <div className="label">Avg max height</div>
        <div className="readout readout--sm">
          {fmt(stats.averageMaxHeight)} <small>m</small>
        </div>
      </div>
    </section>
  );
}

export default function History() {
  usePageTitle('History', 'Review, reload and delete your saved experiments.');
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ mode: '', sort: 'createdAt', order: 'desc', page: 1 });
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [stats, setStats] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await api.listExperiments({ ...filters, pageSize: PAGE_SIZE });
      setState({ status: 'ready', data: res, error: '' });
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message });
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, [state.data?.total]);

  const update = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  async function remove(id) {
    setDeleteError('');
    try {
      await api.deleteExperiment(id);
      setConfirmId(null);
      await load();
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  const rows = state.data?.data ?? [];

  return (
    <div className="stack">
      <h1>History</h1>
      <StatsStrip stats={stats} />

      <section className="panel panel--compact" aria-label="Filters">
        <div className="row">
          <label className="row">
            <span className="label">Mode</span>
            <select
              className="select"
              style={{ width: '9rem' }}
              value={filters.mode}
              onChange={(e) => update({ mode: e.target.value })}
            >
              <option value="">All</option>
              <option value="free">Free play</option>
              <option value="target">Target</option>
            </select>
          </label>
          <label className="row">
            <span className="label">Sort by</span>
            <select
              className="select"
              style={{ width: '10rem' }}
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value })}
            >
              <option value="createdAt">Date</option>
              <option value="range">Range</option>
              <option value="maxHeight">Max height</option>
              <option value="velocity">Velocity</option>
              <option value="angle">Angle</option>
            </select>
          </label>
          <button
            className="button button--small"
            onClick={() => update({ order: filters.order === 'desc' ? 'asc' : 'desc' })}
            aria-label={`Order: ${filters.order === 'desc' ? 'descending' : 'ascending'}. Click to reverse.`}
          >
            {filters.order === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
      </section>

      {state.status === 'loading' && !state.data && <LoadingState label="Loading experiments" />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}
      {state.status === 'ready' && rows.length === 0 && (
        <EmptyState title="No experiments yet">
          <p>
            Run a simulation and press Save, or try the <Link to="/simulator?mode=target">target mode</Link>.
          </p>
          <Link className="button button--primary" to="/simulator">
            Open simulator
          </Link>
        </EmptyState>
      )}

      {rows.length > 0 && (
        <section className="panel panel--compact" aria-label="Saved experiments" aria-busy={state.status === 'loading'}>
          {deleteError && (
            <p className="field__error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Saved experiments</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Angle</th>
                  <th scope="col">v0</th>
                  <th scope="col">Drag</th>
                  <th scope="col">Max h</th>
                  <th scope="col">Range</th>
                  <th scope="col">Time</th>
                  <th scope="col">Result</th>
                  <th scope="col">Note</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="badge">{e.mode}</span>
                    </td>
                    <td>{fmt(e.angle, 1)}°</td>
                    <td>{fmt(e.velocity, 1)} m/s</td>
                    <td>{e.airResistanceEnabled ? 'on' : 'off'}</td>
                    <td>{fmt(e.maxHeight)} m</td>
                    <td>{fmt(e.range)} m</td>
                    <td>{fmt(e.timeOfFlight)} s</td>
                    <td>
                      {e.targetAttempt ? (
                        e.targetAttempt.hit ? (
                          <span className="text-ok">HIT +{e.targetAttempt.score}</span>
                        ) : (
                          <span className="text-alert">MISS {fmt(e.targetAttempt.missDistance)} m</span>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="note">{e.note || '-'}</td>
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <button
                          className="button button--small"
                          onClick={() => navigate(`/simulator?load=${e.id}`)}
                          aria-label={`Load experiment ${e.id} into the simulator`}
                        >
                          Load
                        </button>
                        {confirmId === e.id ? (
                          <>
                            <button className="button button--small button--danger" onClick={() => remove(e.id)}>
                              Confirm
                            </button>
                            <button className="button button--small" onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="button button--small button--danger"
                            onClick={() => setConfirmId(e.id)}
                            aria-label={`Delete experiment ${e.id}`}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button
              className="button button--small"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Prev
            </button>
            <span className="text-dim" aria-live="polite">
              Page {state.data.page} of {state.data.totalPages} ({state.data.total} total)
            </span>
            <button
              className="button button--small"
              disabled={filters.page >= state.data.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
