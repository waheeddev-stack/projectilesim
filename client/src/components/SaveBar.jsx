import { useState } from 'react';
import { Link } from 'react-router-dom';

/** "Save experiment" with an optional note. Requires login. */
export default function SaveBar({ user, run, saved, onSave }) {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState({ busy: false, error: '' });

  if (!user) {
    return (
      <section className="panel panel--compact">
        <h2>Save experiment</h2>
        <p style={{ margin: 0 }} className="text-dim">
          <Link to="/login">Log in</Link> or <Link to="/register">register</Link> to save experiments.
        </p>
      </section>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setStatus({ busy: true, error: '' });
    try {
      await onSave(run, note);
      setNote('');
      setStatus({ busy: false, error: '' });
    } catch (err) {
      setStatus({ busy: false, error: err.message });
    }
  }

  return (
    <section className="panel panel--compact" aria-labelledby="save-title">
      <h2 id="save-title">Save experiment</h2>
      <form onSubmit={submit} className="row">
        <label className="sr-only" htmlFor="note">
          Note (optional)
        </label>
        <input
          id="note"
          className="input"
          style={{ flex: '1 1 14rem', width: 'auto' }}
          maxLength={500}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="button button--primary" type="submit" disabled={!run || saved || status.busy}>
          {status.busy ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </form>
      <div aria-live="polite">
        {saved && (
          <p className="text-ok" style={{ margin: '0.6rem 0 0' }}>
            Saved. See it in <Link to="/history">History</Link>.
          </p>
        )}
        {status.error && (
          <p className="field__error" role="alert" style={{ margin: '0.6rem 0 0' }}>
            {status.error}
          </p>
        )}
        {!run && (
          <p className="text-dim" style={{ margin: '0.6rem 0 0' }}>
            Launch a run first.
          </p>
        )}
      </div>
    </section>
  );
}
