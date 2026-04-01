function formatText(value) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

function ModuleTile({ name, online }) {
  return (
    <div className="module-tile">
      <div className="module-left">
        <span className={`module-dot ${online ? "online" : "offline"}`} />
        <span className="module-name">{name}</span>
      </div>
      <strong>{online ? "online" : "offline"}</strong>
    </div>
  );
}

export default function ModulesCard({
  oled = {},
  oledOnline = false,
  modules = [],
  expanded = false,
  onToggle,
}) {
  return (
    <div
      className={`panel stat-panel modules-panel ${expanded ? "is-expanded" : ""}`}
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
          <span className="panel-kicker">Components</span>
          <span className="panel-title">OLED & modules</span>
        </div>
        <span className="log-badge">MOD</span>
      </div>

      <div className="modules-top-summary">
        <div className="mini-stat">
          <span className="mini-label">OLED</span>
          <span className="mini-value">{oledOnline ? "online" : "offline"}</span>
        </div>

        <div className="mini-stat">
          <span className="mini-label">Page</span>
          <span className="mini-value">{formatText(oled?.page)}</span>
        </div>

        <div className="mini-stat">
          <span className="mini-label">Title</span>
          <span className="mini-value">{formatText(oled?.title)}</span>
        </div>
      </div>

      <div className="modules-grid">
        {modules.map((module) => (
          <ModuleTile
            key={module.name}
            name={module.name}
            online={module.online}
          />
        ))}
      </div>

      {expanded ? (
        <div className="card-detail">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">OLED</span>
              <strong className="detail-value">
                {oledOnline ? "online" : "offline"}
              </strong>
            </div>

            <div className="detail-item">
              <span className="detail-label">Page</span>
              <strong className="detail-value">{formatText(oled?.page)}</strong>
            </div>

            <div className="detail-item detail-item-wide">
              <span className="detail-label">Title</span>
              <strong className="detail-value">{formatText(oled?.title)}</strong>
            </div>

            <div className="detail-item detail-item-wide">
              <span className="detail-label">Source</span>
              <strong className="detail-value">
                {formatText(oled?.lastActionSource)}
              </strong>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}