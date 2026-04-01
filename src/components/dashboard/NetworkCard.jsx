function formatText(value) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

export default function NetworkCard({
  hub = {},
  signalPercent = 0,
  signalColor = "#8899a6",
  rssiValue = null,
  expanded = false,
  onToggle,
}) {
  return (
    <div
      className={`panel network-panel ${expanded ? "is-expanded" : ""}`}
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
          <span className="panel-kicker">Conectivitate</span>
          <span className="panel-title">Semnal & rețea</span>
        </div>
        <span className="log-badge">Wi-Fi</span>
      </div>

      <div className="network-simple">
        <div className="network-row">
          <span>Status</span>
          <strong>{hub?.wifiConnected ? "Conectat" : "Deconectat"}</strong>
        </div>

        <div className="network-row">
          <span>Hub</span>
          <strong>{formatText(hub?.name)}</strong>
        </div>

        <div className="network-row">
          <span>IP</span>
          <strong>{formatText(hub?.ip)}</strong>
        </div>

        <div className="network-row">
          <span>Clients</span>
          <strong>{formatText(hub?.clients)}</strong>
        </div>

        <div className="network-row">
          <span>RSSI</span>
          <strong>{rssiValue !== null ? `${rssiValue} dBm` : "--"}</strong>
        </div>
      </div>

      <div className="signal-wrap">
        <div className="signal-row">
          <span>Putere semnal</span>
          <strong>{signalPercent}%</strong>
        </div>

        <div className="signal-bar">
          <div
            className="signal-fill"
            style={{
              width: `${signalPercent}%`,
              background: signalColor,
            }}
          />
        </div>
      </div>

      {expanded ? (
        <div className="card-detail">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">WiFi</span>
              <strong className="detail-value">
                {hub?.wifiConnected ? "connected" : "offline"}
              </strong>
            </div>

            <div className="detail-item">
              <span className="detail-label">Signal</span>
              <strong className="detail-value">{signalPercent}%</strong>
            </div>

            <div className="detail-item">
              <span className="detail-label">Clients</span>
              <strong className="detail-value">
                {formatText(hub?.clients)}
              </strong>
            </div>

            <div className="detail-item detail-item-wide">
              <span className="detail-label">Address</span>
              <strong className="detail-value">{formatText(hub?.ip)}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}