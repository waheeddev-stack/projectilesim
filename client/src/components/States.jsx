/** Shared loading / error / empty placeholders. */

export function LoadingState({ label = 'Loading' }) {
  return (
    <div className="panel state" role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" /> <span>{label}...</span>
      <div className="skeleton" aria-hidden="true" />
      <div className="skeleton" aria-hidden="true" style={{ width: '70%', marginInline: 'auto' }} />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="panel panel--alert state state--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button className="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="panel state">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
