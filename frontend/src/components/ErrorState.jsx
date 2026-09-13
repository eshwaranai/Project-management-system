export default function ErrorState({ message, onRetry }) {
  return (
    <div className="ledger">
      <div className="empty-state">
        <div className="empty-title">Unable to load this</div>
        <p>{message}</p>
        {onRetry && (
          <button className="btn btn-primary btn-sm" onClick={onRetry} style={{ marginTop: 10 }}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
