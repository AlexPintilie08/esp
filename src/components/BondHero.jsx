function isOnlineStatus(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "online";
  return false;
}

function getComponentOnline(components, key) {
  const entry = components?.[key];

  if (!entry) return false;

  if (typeof entry === "string" || typeof entry === "boolean") {
    return isOnlineStatus(entry);
  }

  if (typeof entry === "object") {
    if ("status" in entry) return isOnlineStatus(entry.status);
    if ("online" in entry) return Boolean(entry.online);
    if ("connected" in entry) return Boolean(entry.connected);
  }

  return false;
}

function formatText(value) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

function getHubName(hub) {
  if (hub?.name && String(hub.name).trim()) return String(hub.name);
  return "Mr Hub";
}

function getNarrative(hubOnline, motionOnline) {
  if (hubOnline && motionOnline) return "Bond stabil";
  if (hubOnline && !motionOnline) return "Hub ready, waiting for companion";
  if (!hubOnline && motionOnline) return "Motion node active, hub unavailable";
  return "System offline";
}

function getBondState(hubOnline, motionOnline) {
  if (hubOnline && motionOnline) return "online";
  if (hubOnline && !motionOnline) return "waiting";
  if (!hubOnline && motionOnline) return "partial";
  return "offline";
}

function statusLabel(online) {
  return online ? "online" : "offline";
}

function RoleBlock({
  kicker,
  name,
  online,
  details = [],
}) {
  return (
    <div className={`bond-role-block ${online ? "is-online" : "is-offline"}`}>
      <div className="bond-role-header">
        <span className="bond-node-kicker">{kicker}</span>
        <h2 className="bond-node-name">{name}</h2>
        <div className="bond-node-status-row">
          <span className={`bond-status-dot ${online ? "online" : "offline"}`} />
          <span className="bond-node-status">{statusLabel(online)}</span>
        </div>
      </div>

      <div className="bond-role-grid">
        {details.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className={`bond-role-item ${item.wide ? "bond-role-item-wide" : ""}`}
          >
            <span className="bond-role-label">{item.label}</span>
            <strong className="bond-role-value">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BondHero({
  data,
  expanded = false,
  onToggle,
  onClose,
}) {
  const hub = data?.hub || {};
  const telemetry = data?.telemetry || {};
  const components = data?.components || {};
  const oled = data?.oled || {};

  const hubOnline =
    isOnlineStatus(hub?.status) || Boolean(hub?.wifiConnected);

  const motionOnline = getComponentOnline(components, "motion");
  const wifiOnline = getComponentOnline(components, "wifi");
  const oledOnline = getComponentOnline(components, "oled");
  const inaOnline = getComponentOnline(components, "ina219");
  const ntcOnline = getComponentOnline(components, "ntc");
  const bmi160Online = getComponentOnline(components, "bmi160");
  const rtcOnline = getComponentOnline(components, "rtc");

  const narrative = getNarrative(hubOnline, motionOnline);
  const bondState = getBondState(hubOnline, motionOnline);

  if (expanded) {
    return (
      <section className={`panel bond-hero bond-detail bond-${bondState}`}>
        <div className="bond-detail-topbar">
          <div className="bond-detail-title-wrap">
            <span className="bond-node-kicker">Bond detail</span>
            <div className="bond-detail-narrative">{narrative}</div>
          </div>

          <button
            type="button"
            className="detail-back-button"
            onClick={onClose}
          >
            Back to dashboard
          </button>
        </div>

        <div className="bond-detail-layout">
          <RoleBlock
            kicker="Primary node"
            name={getHubName(hub)}
            online={hubOnline}
            details={[
              { label: "Role", value: "Central coordinator" },
              { label: "IP", value: formatText(hub?.ip) },
              { label: "WiFi", value: hub?.wifiConnected ? "connected" : "offline" },
              { label: "RSSI", value: hub?.rssi ?? "--" },
              { label: "Clients", value: formatText(hub?.clients) },
              { label: "Temp", value: telemetry?.temperature ?? "--" },
              { label: "Voltage", value: telemetry?.voltage ?? "--" },
              { label: "Current", value: telemetry?.current ?? "--" },
              { label: "OLED", value: oledOnline ? "online" : "offline" },
              { label: "OLED page", value: formatText(oled?.page) },
              { label: "OLED title", value: formatText(oled?.title), wide: true },
            ]}
          />

          <div className="bond-relationship-column">
            <div className="bond-relationship-symbol">⇄</div>
            <div className="bond-relationship-state">{bondState}</div>
            <div className="bond-relationship-copy">{narrative}</div>
          </div>

          <RoleBlock
            kicker="Companion node"
            name="Ms Motion"
            online={motionOnline}
            details={[
              { label: "Role", value: "Companion sensor node" },
              { label: "Motion", value: motionOnline ? "available" : "unavailable" },
              { label: "BMI160", value: bmi160Online ? "online" : "offline" },
              { label: "RTC", value: rtcOnline ? "online" : "offline" },
              { label: "NTC", value: ntcOnline ? "online" : "offline" },
              { label: "INA219", value: inaOnline ? "online" : "offline" },
              { label: "WiFi", value: wifiOnline ? "online" : "offline" },
              {
                label: "Bond role",
                value: motionOnline
                  ? "Feeds motion / companion state"
                  : "Waiting to join bond",
                wide: true,
              },
            ]}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`panel bond-hero bond-${bondState}`}
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
      <div className="bond-hero-top">
        <div className="bond-node bond-node-left">
          <span className="bond-node-kicker">Primary node</span>
          <h2 className="bond-node-name">{getHubName(hub)}</h2>

          <div className="bond-node-status-row">
            <span className={`bond-status-dot ${hubOnline ? "online" : "offline"}`} />
            <span className="bond-node-status">{statusLabel(hubOnline)}</span>
          </div>
        </div>

        <div className="bond-center">
          <div className="bond-link-symbol">⇄</div>
          <div className="bond-link-state">{bondState}</div>
        </div>

        <div className="bond-node bond-node-right">
          <span className="bond-node-kicker">Companion node</span>
          <h2 className="bond-node-name">Ms Motion</h2>

          <div className="bond-node-status-row">
            <span
              className={`bond-status-dot ${motionOnline ? "online" : "offline"}`}
            />
            <span className="bond-node-status">{statusLabel(motionOnline)}</span>
          </div>
        </div>
      </div>

      <div className="bond-hero-bottom">
        <div className="bond-narrative">{narrative}</div>

        <div className="bond-meta">
          <span>Hub IP: {formatText(hub?.ip)}</span>
          <span>WiFi: {hub?.wifiConnected ? "connected" : "offline"}</span>
          <span>RSSI: {hub?.rssi ?? "--"}</span>
        </div>
      </div>
    </section>
  );
}