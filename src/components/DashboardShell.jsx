import { useMemo } from "react";
import GraphCard from "./dashboard/GraphCard";
import LogsCard from "./dashboard/LogsCard";
import NetworkCard from "./dashboard/NetworkCard";
import MetricCard from "./dashboard/MetricCard";
import ModulesCard from "./dashboard/ModulesCard";

const HISTORY_POINTS = 30;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatValue(value, digits = 1, unit = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${Number(value).toFixed(digits)}${unit}`;
}

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

function getNiceScale(min, max, step = 5) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : step;

  const niceMax = Math.ceil(safeMax / step) * step;
  const niceMin = Math.floor(safeMin / step) * step;

  const ticks = [];
  for (let value = niceMin; value <= niceMax; value += step) {
    ticks.push(value);
  }

  return { niceMin, niceMax, ticks };
}

function normalizeSeries(values, fallback = 0) {
  const safe = [];
  let last = fallback;

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (Number.isFinite(value)) {
      last = value;
      safe.push(value);
    } else {
      safe.push(last);
    }
  }

  return safe;
}

function getTemperatureState(value, sensorOnline) {
  if (!sensorOnline || value === null) return "offline";
  if (value < 18) return "cool";
  if (value < 28) return "normal";
  if (value < 35) return "warm";
  return "hot";
}

function CompactNavCard({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      className={`detail-nav-card ${isActive ? "is-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function DashboardShell({
  data,
  error,
  darkMode,
  temperatureHistory = [],
  currentHistory = [],
  activeCard,
  setActiveCard,
}) {
  const openCard = (cardId) => {
    setActiveCard(cardId);
  };

  const closeDetailMode = () => {
    setActiveCard(null);
  };

  const isDetailMode = Boolean(activeCard);

  const hub = data?.hub || {};
  const telemetry = data?.telemetry || {};
  const components = data?.components || {};
  const oled = data?.oled || {};
  const logs = Array.isArray(data?.logs) ? data.logs.slice(0, 5) : [];

  const temperature = toNumber(telemetry?.temperature);
  const voltage = toNumber(telemetry?.voltage);
  const current = toNumber(telemetry?.current);
  const currentTotalmAh = toNumber(telemetry?.currentTotalmAh);
  const batteryPercent = toNumber(telemetry?.batteryPercent);
  const batteryLifeH = toNumber(telemetry?.batteryLifeH);
  const cpuLoadPercent = toNumber(telemetry?.cpuLoadPercent);
  //ADAUGAT ACUM 
  const roll = toNumber(telemetry?.roll);
  const pitch = toNumber(telemetry?.pitch);

  const wifiOnline = getComponentOnline(components, "wifi");
  const oledOnline = getComponentOnline(components, "oled");
  const inaOnline = getComponentOnline(components, "ina219");
  const ntcOnline = getComponentOnline(components, "ntc");
  const bmi160Online = getComponentOnline(components, "bmi160");
  const rtcOnline = getComponentOnline(components, "rtc");
  const motionOnline = getComponentOnline(components, "motion");

  const modules = [
    { name: "wifi", online: wifiOnline },
    { name: "oled", online: oledOnline },
    { name: "ina219", online: inaOnline },
    { name: "ntc", online: ntcOnline },
    { name: "bmi160", online: bmi160Online },
    { name: "rtc", online: rtcOnline },
    { name: "motion", online: motionOnline },
  ];

  const tempValues = temperatureHistory.filter((v) => Number.isFinite(v));
  const currentValues = currentHistory.filter((v) => Number.isFinite(v));

  const tempFallback = temperature ?? 0;
  const currentFallback = current ?? 0;

  const safeTempHistory = useMemo(() => {
    const source = temperatureHistory.length
      ? temperatureHistory
      : Array(HISTORY_POINTS).fill(tempFallback);
    return normalizeSeries(source, tempFallback);
  }, [temperatureHistory, tempFallback]);

  const safeCurrentHistory = useMemo(() => {
    const source = currentHistory.length
      ? currentHistory
      : Array(HISTORY_POINTS).fill(currentFallback);
    return normalizeSeries(source, currentFallback);
  }, [currentHistory, currentFallback]);

  const tempMin = tempValues.length ? Math.min(...tempValues) : tempFallback;
  const tempMax = tempValues.length ? Math.max(...tempValues) : tempFallback;
  const currentMin = currentValues.length
    ? Math.min(...currentValues)
    : currentFallback;
  const currentMax = currentValues.length
    ? Math.max(...currentValues)
    : currentFallback;

  const tempScale = getNiceScale(tempMin, tempMax, 2);
  const currentScale = getNiceScale(currentMin, currentMax, 0.2);

  const tempChartMin = Math.floor((tempMin - 1) * 10) / 10;
  const tempChartMax = Math.ceil((tempMax + 1) * 10) / 10;

  const currentChartMin = Math.floor((currentMin - 0.08) * 100) / 100;
  const currentChartMax = Math.ceil((currentMax + 0.08) * 100) / 100;

  const rssiValue = toNumber(hub?.rssi);

  const signalPercent = (() => {
    if (rssiValue === null) return 0;
    if (rssiValue >= -50) return 100;
    if (rssiValue <= -90) return 10;
    return Math.round(((rssiValue + 90) / 40) * 90 + 10);
  })();

  const signalColor = (() => {
    if (rssiValue === null) return "#8899a6";
    if (rssiValue >= -60) return "#22c55e";
    if (rssiValue >= -75) return "#f59e0b";
    return "#ef4444";
  })();

  const temperatureState = getTemperatureState(temperature, ntcOnline);

  const cards = {
    temperature: (
      <GraphCard
        title="temperature"
        liveValue={temperature !== null ? temperature.toFixed(1) : "--"}
        liveUnit="°C"
        minLabel={formatValue(tempMin, 1, "°C")}
        maxLabel={formatValue(tempMax, 1, "°C")}
        footerLabel={ntcOnline ? "temperatura live" : "sensor NTC offline"}
        values={safeTempHistory}
        ticks={tempScale.ticks}
        color={darkMode ? "#c8d8e4" : "#2b6777"}
        minValue={tempChartMin}
        maxValue={tempChartMax}
        darkMode={darkMode}
        expanded={isDetailMode && activeCard === "temperature"}
        onToggle={() => openCard("temperature")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">State</span>
              <strong className="detail-value">{temperatureState}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Sensor</span>
              <strong className="detail-value">
                {ntcOnline ? "online" : "offline"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Min</span>
              <strong className="detail-value">{formatValue(tempMin, 1, "°C")}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Max</span>
              <strong className="detail-value">{formatValue(tempMax, 1, "°C")}</strong>
            </div>
          </div>
        }
      />
    ),
    current: (
      <GraphCard
        title="current"
        liveValue={current !== null ? current.toFixed(2) : "--"}
        liveUnit="A"
        minLabel={formatValue(currentMin, 2, "mA")}
        maxLabel={formatValue(currentMax, 2, "mA")}
        footerLabel={inaOnline ? "curent live" : "sensor INA219 offline"}
        values={safeCurrentHistory}
        ticks={currentScale.ticks}
        color="#52ab98"
        minValue={currentChartMin}
        maxValue={currentChartMax}
        darkMode={darkMode}
        expanded={isDetailMode && activeCard === "current"}
        onToggle={() => openCard("current")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Instant</span>
              <strong className="detail-value">{formatValue(current, 2, "A")}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Sensor</span>
              <strong className="detail-value">
                {inaOnline ? "online" : "offline"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Min</span>
              <strong className="detail-value">{formatValue(currentMin, 2, "A")}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Max</span>
              <strong className="detail-value">{formatValue(currentMax, 2, "A")}</strong>
            </div>
          </div>
        }
      />
    ),
    logs: (
      <LogsCard
        logs={logs}
        error={error}
        expanded={isDetailMode && activeCard === "logs"}
        onToggle={() => openCard("logs")}
      />
    ),
    network: (
      <NetworkCard
        hub={hub}
        signalPercent={signalPercent}
        signalColor={signalColor}
        rssiValue={rssiValue}
        expanded={isDetailMode && activeCard === "network"}
        onToggle={() => openCard("network")}
      />
    ),
    cpu: (
      <MetricCard
        kicker="Procesare"
        title="CPU Load"
        badge="CPU"
        mainValue={cpuLoadPercent !== null ? cpuLoadPercent.toFixed(0) : "--"}
        mainUnit="%"
        progress={cpuLoadPercent ?? 0}
        subtext="ESP load în timp real"
        expanded={isDetailMode && activeCard === "cpu"}
        onToggle={() => openCard("cpu")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Load</span>
              <strong className="detail-value">
                {cpuLoadPercent !== null ? `${cpuLoadPercent.toFixed(0)}%` : "--"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">State</span>
              <strong className="detail-value">
                {cpuLoadPercent === null
                  ? "--"
                  : cpuLoadPercent < 40
                  ? "light"
                  : cpuLoadPercent < 75
                  ? "normal"
                  : "high"}
              </strong>
            </div>
          </div>
        }
      />
    ),
    voltage: (
      <MetricCard
        kicker="Alimentare"
        title="Tensiune"
        badge="VCC"
        mainValue={voltage !== null ? voltage.toFixed(2) : "--"}
        mainUnit="V"
        miniStats={[
          {
            label: "Current",
            value: current !== null ? `${current.toFixed(2)} A` : "--",
          },
          {
            label: "Sensor",
            value: inaOnline ? "online" : "offline",
          },
        ]}
        expanded={isDetailMode && activeCard === "voltage"}
        onToggle={() => openCard("voltage")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Voltage</span>
              <strong className="detail-value">{formatValue(voltage, 2, "V")}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Current</span>
              <strong className="detail-value">{formatValue(current, 2, "A")}</strong>
            </div>
            <div className="detail-item detail-item-wide">
              <span className="detail-label">INA219</span>
              <strong className="detail-value">
                {inaOnline ? "online" : "offline"}
              </strong>
            </div>
          </div>
        }
      />
    ),
    battery: (
      <MetricCard
        kicker="Power"
        title="Consum & baterie"
        badge="BAT"
        mainValue={batteryLifeH !== null ? batteryLifeH.toFixed(1) : "--"}
        mainUnit="h"
        miniStats={[
          {
            label: "Instant",
            value: current !== null ? `${current.toFixed(2)} A` : "--",
          },
          {
            label: "Total",
            value:
              currentTotalmAh !== null
                ? `${currentTotalmAh.toFixed(0)} mAh`
                : "--",
          },
        ]}
        progress={batteryPercent ?? 0}
        progressClassName="battery-fill"
        subtext={`Autonomie: ${
          batteryLifeH !== null ? `${batteryLifeH.toFixed(1)} h` : "--"
        }`}
        expanded={isDetailMode && activeCard === "battery"}
        onToggle={() => openCard("battery")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Battery</span>
              <strong className="detail-value">
                {batteryPercent !== null ? `${batteryPercent.toFixed(0)}%` : "--"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Life</span>
              <strong className="detail-value">
                {batteryLifeH !== null ? `${batteryLifeH.toFixed(1)} h` : "--"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Instant</span>
              <strong className="detail-value">{formatValue(current, 2, "mA")}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total</span>
              <strong className="detail-value">
                {currentTotalmAh !== null
                  ? `${currentTotalmAh.toFixed(0)} mAh`
                  : "--"}
              </strong>
            </div>
          </div>
        }
      />
    ),
    modules: (
      <ModulesCard
        oled={oled}
        oledOnline={oledOnline}
        modules={modules}
        expanded={isDetailMode && activeCard === "modules"}
        onToggle={() => openCard("modules")}
      />
    ),
    motion: (
      <div 
        className={`panel ${isDetailMode && activeCard === "motion" ? "is-expanded" : ""}`}
        onClick={() => !isDetailMode && openCard("motion")}
      >
        <div className="panel-header-log">
          <div className="panel-title-group">
            <span className="panel-kicker">BMI160 Real-Time 3D</span>
            <span className="panel-title">Control Obiect VR</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 auto', justifyContent: 'center' }}>
          
          {/* Implementarea Cubului 3D */}
          <div className="cube-container">
            <div 
              className="cube" 
              style={{ 
                transform: `rotateX(${-pitch}deg) rotateZ(${-roll}deg)` 
              }}
            >
              <div className="cube-face face-front">FRONT</div>
              <div className="cube-face face-back">BACK</div>
              <div className="cube-face face-right">RIGHT</div>
              <div className="cube-face face-left">LEFT</div>
              <div className="cube-face face-top">TOP</div>
              <div className="cube-face face-bottom">BOTTOM</div>
            </div>
          </div>

          {/* Afișare Accelerație (Cerință suplimentară) */}
          <div className="accel-badge">
            ACCEL: {telemetry?.accel ? telemetry.accel.toFixed(2) : "0.00"} m/s²
          </div>
        </div>

        {isDetailMode && activeCard === "motion" && (
          <div className="detail-grid" style={{ marginTop: '16px' }}>
            <div className="detail-item">
              <span className="detail-label">Roll (Z)</span>
              <strong className="detail-value">{roll?.toFixed(1)}°</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Pitch (X)</span>
              <strong className="detail-value">{pitch?.toFixed(1)}°</strong>
            </div>
          </div>
        )}
      </div>
    ),
    
    

  };
  

  const detailOrder = [
    { id: "temperature", label: "Temperature" },
    { id: "current", label: "Current" },
    { id: "network", label: "Network" },
    { id: "cpu", label: "CPU Load" },
    { id: "voltage", label: "Voltage" },
    { id: "battery", label: "Battery" },
    { id: "modules", label: "OLED & Modules" },
    { id: "logs", label: "Logs" },
    { id: "motion", label: "Orizont Artificial" },
  ];

  if (isDetailMode) {
    return (
      <>
        <h1>ESP32 Dashboard</h1>

        <section className="detail-mode-layout">
          <div className="detail-main-column">
            <div className="detail-main-toolbar">
              <button
                type="button"
                className="detail-back-button"
                onClick={closeDetailMode}
              >
                Back to dashboard
              </button>
            </div>

            <div className="detail-main-card">{cards[activeCard]}</div>
          </div>

          <aside className="detail-sidebar">
            <div className="detail-sidebar-title">Cards</div>

            <div className="detail-sidebar-list">
              {detailOrder.map((item) => (
                <CompactNavCard
                  key={item.id}
                  label={item.label}
                  isActive={activeCard === item.id}
                  onClick={() => openCard(item.id)}
                />
              ))}
            </div>
          </aside>
        </section>
      </>
    );
  }

  return (
    <>
      <h1>ESP32 Dashboard</h1>

      <section className="level level-top">
        {cards.temperature}
        {cards.current}
      </section>

      <section className="level level-auto">
        {cards.logs}
        {cards.network}
      </section>

      <section className="bottom-grid">
        {cards.cpu}
        {cards.voltage}
        {cards.battery}
        {cards.modules}
        {cards.motion}
      </section>
    </>
  );
}