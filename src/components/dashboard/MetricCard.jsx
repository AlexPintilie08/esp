export default function MetricCard({
  kicker,
  title,
  badge,
  mainValue = "--",
  mainUnit = "",
  subtext = "",
  progress = null,
  progressClassName = "",
  miniStats = [],
  expanded = false,
  onToggle,
  detailContent = null,
}) {
  return (
    <div
      className={`panel stat-panel metric-card ${expanded ? "is-expanded" : ""}`}
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
          <span className="panel-kicker">{kicker}</span>
          <span className="panel-title">{title}</span>
        </div>

        {badge ? <span className="log-badge">{badge}</span> : null}
      </div>

      <div className="stat-main">
        <span className="stat-number">{mainValue}</span>
        {mainUnit ? <span className="stat-unit">{mainUnit}</span> : null}
      </div>

      {miniStats.length > 0 ? (
        <div className="dual-stats">
          {miniStats.map((item) => (
            <div className="mini-stat" key={`${item.label}-${item.value}`}>
              <span className="mini-label">{item.label}</span>
              <span className="mini-value">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {progress !== null ? (
        <div className="progress-bar">
          <div
            className={`progress-fill ${progressClassName}`.trim()}
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
            }}
          />
        </div>
      ) : null}

      {subtext ? <div className="stat-subtext">{subtext}</div> : null}

      {expanded && detailContent ? (
        <div className="card-detail">{detailContent}</div>
      ) : null}
    </div>
  );
}