function formatText(value) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

export default function LogsCard({
  logs = [],
  error = "",
  expanded = false,
  onToggle,
}) {
  return (
    <div
      className={`panel log-panel ${expanded ? "is-expanded" : ""}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle?.();
        }
      }}
    >
      <div className="panel-header-log">
        <div className="panel-title-group">
          <span className="panel-kicker">Monitorizare</span>
          <span className="panel-title">Log I/O în timp real</span>
        </div>
        <span className="log-badge">I/O</span>
      </div>

      <div className="log-container">
        {logs.length === 0 ? (
          <div className="empty-log">
            {error ? `Eroare: ${error}` : "Nu există încă date în log."}
          </div>
        ) : (
          logs.map((line, index) => (
            <div key={`${line?.timestamp}-${index}`} className="log-line">
              [{formatText(line?.timestamp)}] {formatText(line?.message)}
            </div>
          ))
        )}
      </div>

      {expanded ? (
        <div className="card-detail">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Entries</span>
              <strong className="detail-value">{logs.length}</strong>
            </div>

            <div className="detail-item">
              <span className="detail-label">Feed</span>
              <strong className="detail-value">1s update</strong>
            </div>

            <div className="detail-item detail-item-wide">
              <span className="detail-label">Status</span>
              <strong className="detail-value">
                {error ? "degraded" : "live"}
              </strong>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}