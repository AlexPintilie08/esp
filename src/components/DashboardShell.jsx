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

function getNiceScale(min, max, step = 5) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : step;

  const niceMax = Math.ceil(safeMax / step) * step;
  const niceMin = Math.floor(safeMin / step) * step;

  const ticks = [];
  for (let value = niceMin; value <= niceMax; value += step) {
    ticks.push(Number(value.toFixed(1)));
  }

  return { niceMin, niceMax, ticks };
}

function clampAbsPercent(value, maxAbs = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.abs(n) / maxAbs, 1) * 50;
}

function MotionAxisBar({ label, value, unit = "G", maxAbs = 3 }) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const width = clampAbsPercent(safe, maxAbs);
  const direction = safe >= 0 ? "positive" : "negative";

  return (
    <div className="motion-bar-row">
      <span className="motion-bar-label">{label}</span>

      <div className="motion-bar-track">
        <span
          className={`motion-bar-fill ${direction}`}
          style={{
            width: `${width}%`,
            transform:
              direction === "positive"
                ? "translateX(0)"
                : `translateX(-${width}%)`,
          }}
        />
      </div>

      <span className="motion-bar-value">
        {safe.toFixed(unit === "G" ? 2 : 1)}
        {unit}
      </span>
    </div>
  );
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

function EventBadge({ label, active }) {
  return (
    <div className={`parachute-event-badge ${active ? "is-active" : ""}`}>
      <span className="parachute-event-dot" />
      {label}
    </div>
  );
}

export default function DashboardShell({
  data,
  backendIp,
  error,
  darkMode,
  temperatureHistory = [],
  currentHistory = [],
  bpmHistory = [],
  spo2History = [],
  riskHistory = [],
  activeCard,
  setActiveCard,
}) {
  const openCard = (cardId) => setActiveCard(cardId);
  const closeDetailMode = () => setActiveCard(null);
  const isDetailMode = Boolean(activeCard);

  const health = data?.health || {};
  const motionData = data?.motion || {};
  const ai = data?.ai || {};
  const wireless = data?.wireless || {};
  const power = data?.power || {};
  const system = data?.system || {};
  const logs = Array.isArray(data?.logs) ? data.logs.slice(0, 6) : [];

  const temperature = toNumber(health.temperature);
  const bpm = toNumber(health.bpm);
  const spo2 = toNumber(health.spo2);
  const stress = health.stress || "NO DATA";

  const accX = toNumber(motionData.accX) ?? 0;
  const accY = toNumber(motionData.accY) ?? 0;
  const accZ = toNumber(motionData.accZ) ?? 0;
  const accTotal = toNumber(motionData.accTotal) ?? 0;

  const gyroX = toNumber(motionData.gyroX) ?? 0;
  const gyroY = toNumber(motionData.gyroY) ?? 0;
  const gyroZ = toNumber(motionData.gyroZ) ?? 0;

  const riskScore = toNumber(ai.riskScore);
  const alert = ai.alert || data?.status || "OFFLINE";
  const prediction = ai.prediction || "waiting for wearable data";

  const voltage = toNumber(power.voltage);
  const current = toNumber(power.currentNow);
  const batteryPercent = toNumber(power.batteryPercent);
  const batteryLifeH = toNumber(power.estimatedLife);
  const cpuLoadPercent = toNumber(system.cpuLoad);

  const rssiValue = toNumber(wireless.rssi);

  const hub = {
    ssid: wireless.ssid || "--",
    ip: wireless.ip || "--",
    mac: wireless.mac || "--",
    rssi: wireless.rssi ?? -127,
    signalLevel: wireless.signalLevel || "Offline",
    connected: wireless.connected,
  };

  const components = {
    wifi: { online: Boolean(wireless.connected) },
    oled: { online: true },
    ina219: { online: voltage !== null && voltage > 0 },
    ntc: { online: temperature !== null && temperature > 0 },
    bmi160: { online: true },
    max30102: { online: bpm !== null || spo2 !== null },
    ai: { online: riskScore !== null },
    motion: { online: true },
  };

  const oled = {
    page: "--",
    status: "online",
  };

  const modules = [
    { name: "wifi", online: Boolean(components.wifi.online) },
    { name: "oled", online: Boolean(components.oled.online) },
    { name: "ina219", online: Boolean(components.ina219.online) },
    { name: "ntc", online: Boolean(components.ntc.online) },
    { name: "bmi160", online: Boolean(components.bmi160.online) },
    { name: "max30102", online: Boolean(components.max30102.online) },
    { name: "ai", online: Boolean(components.ai.online) },
  ];

  const tempFallback = temperature ?? 0;
  const currentFallback = current ?? 0;
  const bpmFallback = bpm ?? 0;
  const spo2Fallback = spo2 ?? 0;
  const riskFallback = riskScore ?? 0;

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

  const safeBpmHistory = useMemo(() => {
    const source = bpmHistory.length
      ? bpmHistory
      : Array(HISTORY_POINTS).fill(bpmFallback);
    return normalizeSeries(source, bpmFallback);
  }, [bpmHistory, bpmFallback]);

  const safeSpo2History = useMemo(() => {
    const source = spo2History.length
      ? spo2History
      : Array(HISTORY_POINTS).fill(spo2Fallback);
    return normalizeSeries(source, spo2Fallback);
  }, [spo2History, spo2Fallback]);

  const safeRiskHistory = useMemo(() => {
    const source = riskHistory.length
      ? riskHistory
      : Array(HISTORY_POINTS).fill(riskFallback);
    return normalizeSeries(source, riskFallback);
  }, [riskHistory, riskFallback]);

  const tempValues = safeTempHistory.filter((v) => Number.isFinite(v));
  const currentValues = safeCurrentHistory.filter((v) => Number.isFinite(v));
  const bpmValues = safeBpmHistory.filter((v) => Number.isFinite(v));
  const spo2Values = safeSpo2History.filter((v) => Number.isFinite(v));
  const riskValues = safeRiskHistory.filter((v) => Number.isFinite(v));

  const tempMin = tempValues.length ? Math.min(...tempValues) : tempFallback;
  const tempMax = tempValues.length ? Math.max(...tempValues) : tempFallback;
  const currentMin = currentValues.length
    ? Math.min(...currentValues)
    : currentFallback;
  const currentMax = currentValues.length
    ? Math.max(...currentValues)
    : currentFallback;
  const bpmMin = bpmValues.length ? Math.min(...bpmValues) : bpmFallback;
  const bpmMax = bpmValues.length ? Math.max(...bpmValues) : bpmFallback;
  const spo2Min = spo2Values.length ? Math.min(...spo2Values) : spo2Fallback;
  const spo2Max = spo2Values.length ? Math.max(...spo2Values) : spo2Fallback;
  const riskMin = riskValues.length ? Math.min(...riskValues) : riskFallback;
  const riskMax = riskValues.length ? Math.max(...riskValues) : riskFallback;

  const tempScale = getNiceScale(tempMin, tempMax, 2);
  const currentScale = getNiceScale(currentMin, currentMax, 10);
  const bpmScale = getNiceScale(bpmMin, bpmMax, 10);
  const spo2Scale = getNiceScale(spo2Min, spo2Max, 2);
  const riskScale = getNiceScale(riskMin, riskMax, 10);

  const tempChartMin = Math.floor((tempMin - 1) * 10) / 10;
  const tempChartMax = Math.ceil((tempMax + 1) * 10) / 10;
  const currentChartMin = Math.floor((currentMin - 0.08) * 100) / 100;
  const currentChartMax = Math.ceil((currentMax + 0.08) * 100) / 100;

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

  const dangerState =
    motionData.freeFallRisk ||
    motionData.excessiveRotation ||
    motionData.noMovement ||
    alert === "DANGER";

  const cards = {
    mission: (
      <MetricCard
        kicker="Mission Control"
        title="Stare parașutist"
        badge={alert}
        mainValue={alert}
        mainUnit=""
        progress={riskScore ?? 0}
        progressClassName={
          alert === "DANGER"
            ? "danger-fill"
            : alert === "WARNING"
              ? "warning-fill"
              : "battery-fill"
        }
        subtext={prediction}
        expanded={isDetailMode && activeCard === "mission"}
        onToggle={() => openCard("mission")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Risk score</span>
              <strong className="detail-value">
                {formatValue(riskScore, 0, "%")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Alert</span>
              <strong className="detail-value">{alert}</strong>
            </div>
            <div className="detail-item detail-item-wide">
              <span className="detail-label">Prediction</span>
              <strong className="detail-value">{prediction}</strong>
            </div>
          </div>
        }
      />
    ),

    parachute: (
      <MetricCard
        kicker="Evenimente de zbor"
        title="Parașută & poziție"
        badge="AIR"
        mainValue={motionData.parachuteOpened ? "OPEN" : "CLOSED"}
        mainUnit=""
        progress={motionData.parachuteOpened ? 100 : 0}
        progressClassName={
          motionData.parachuteOpened ? "battery-fill" : "warning-fill"
        }
        subtext={
          motionData.positionChanged
            ? "poziția parașutistului s-a schimbat"
            : "poziție stabilă"
        }
        expanded={isDetailMode && activeCard === "parachute"}
        onToggle={() => openCard("parachute")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Parașută</span>
              <strong className="detail-value">
                {motionData.parachuteOpened ? "deschisă" : "nedetectată"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Poziție</span>
              <strong className="detail-value">
                {motionData.positionChanged ? "schimbată" : "stabilă"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Accelerație totală</span>
              <strong className="detail-value">
                {formatValue(accTotal, 2, " G")}
              </strong>
            </div>
          </div>
        }
      />
    ),

    pulse: (
      <GraphCard
        title="puls"
        liveValue={bpm !== null ? bpm.toFixed(0) : "--"}
        liveUnit="BPM"
        minLabel={formatValue(bpmMin, 0, " BPM")}
        maxLabel={formatValue(bpmMax, 0, " BPM")}
        footerLabel={
          bpm && bpm > 0 ? "MAX30102 puls live" : "pune degetul pe senzor"
        }
        values={safeBpmHistory}
        ticks={bpmScale.ticks}
        color="#ef4444"
        minValue={Math.max(0, bpmMin - 10)}
        maxValue={Math.max(120, bpmMax + 10)}
        darkMode={darkMode}
        expanded={isDetailMode && activeCard === "pulse"}
        onToggle={() => openCard("pulse")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">BPM</span>
              <strong className="detail-value">
                {formatValue(bpm, 0, " BPM")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Analiză</span>
              <strong className="detail-value">
                {bpm === 0
                  ? "no signal"
                  : bpm > 140
                    ? "puls anormal"
                    : bpm > 110
                      ? "stres posibil"
                      : "normal"}
              </strong>
            </div>
          </div>
        }
      />
    ),

    spo2: (
      <GraphCard
        title="oxigen sânge"
        liveValue={spo2 !== null ? spo2.toFixed(0) : "--"}
        liveUnit="%"
        minLabel={formatValue(spo2Min, 0, "%")}
        maxLabel={formatValue(spo2Max, 0, "%")}
        footerLabel="MAX30102 SpO₂ estimat"
        values={safeSpo2History}
        ticks={spo2Scale.ticks}
        color="#00d2ff"
        minValue={85}
        maxValue={100}
        darkMode={darkMode}
        expanded={isDetailMode && activeCard === "spo2"}
        onToggle={() => openCard("spo2")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">SpO₂</span>
              <strong className="detail-value">
                {formatValue(spo2, 0, "%")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">State</span>
              <strong className="detail-value">
                {spo2 === null || spo2 === 0
                  ? "no signal"
                  : spo2 < 94
                    ? "low oxygen"
                    : "normal"}
              </strong>
            </div>
          </div>
        }
      />
    ),

    temperature: (
      <GraphCard
        title="temperatură corporală"
        liveValue={temperature !== null ? temperature.toFixed(1) : "--"}
        liveUnit="°C"
        minLabel={formatValue(tempMin, 1, "°C")}
        maxLabel={formatValue(tempMax, 1, "°C")}
        footerLabel={
          components.ntc.online
            ? "temperatura live NTC"
            : "sensor NTC offline"
        }
        values={safeTempHistory}
        ticks={tempScale.ticks}
        color={
          temperature < 35
            ? "#00d2ff"
            : temperature < 38
              ? "#f59e0b"
              : "#ef4444"
        }
        minValue={tempChartMin}
        maxValue={tempChartMax}
        darkMode={darkMode}
        expanded={isDetailMode && activeCard === "temperature"}
        onToggle={() => openCard("temperature")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Nivel stres</span>
              <strong className="detail-value">{stress}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Sensor</span>
              <strong className="detail-value">
                {components.ntc.online ? "online" : "offline"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Min</span>
              <strong className="detail-value">
                {formatValue(tempMin, 1, "°C")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Max</span>
              <strong className="detail-value">
                {formatValue(tempMax, 1, "°C")}
              </strong>
            </div>
          </div>
        }
      />
    ),

    risk: (
      <GraphCard
        title="predicție AI"
        liveValue={riskScore !== null ? riskScore.toFixed(0) : "--"}
        liveUnit="%"
        minLabel={formatValue(riskMin, 0, "%")}
        maxLabel={formatValue(riskMax, 0, "%")}
        footerLabel={prediction}
        values={safeRiskHistory}
        ticks={riskScale.ticks}
        color={
          riskScore > 65 ? "#ef4444" : riskScore > 35 ? "#f59e0b" : "#22c55e"
        }
        minValue={0}
        maxValue={100}
        darkMode={darkMode}
        expanded={isDetailMode && activeCard === "risk"}
        onToggle={() => openCard("risk")}
        detailContent={
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Risc accident</span>
              <strong className="detail-value">
                {formatValue(riskScore, 0, "%")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Comportament</span>
              <strong className="detail-value">{prediction}</strong>
            </div>
            <div className="detail-item detail-item-wide">
              <span className="detail-label">Alertare</span>
              <strong className="detail-value">
                {dangerState
                  ? "trimite alertă instructor / echipă"
                  : "monitorizare normală"}
              </strong>
            </div>
          </div>
        }
      />
    ),

    danger: (
      <div
        className={`panel parachute-danger-panel ${
          isDetailMode && activeCard === "danger" ? "is-expanded" : ""
        }`}
        onClick={() => !isDetailMode && openCard("danger")}
      >
        <div className="panel-header-log">
          <div className="panel-title-group">
            <span className="panel-kicker">AI Danger Detection</span>
            <span className="panel-title">Situații periculoase</span>
          </div>
        </div>

        <div className="parachute-events-grid">
          <EventBadge
            label="Cădere necontrolată"
            active={motionData.freeFallRisk}
          />
          <EventBadge
            label="Rotație excesivă"
            active={motionData.excessiveRotation}
          />
          <EventBadge label="Lipsă mișcare" active={motionData.noMovement} />
          <EventBadge
            label="Poziție schimbată"
            active={motionData.positionChanged}
          />
          <EventBadge
            label="Parașută deschisă"
            active={motionData.parachuteOpened}
          />
        </div>

        {isDetailMode && activeCard === "danger" && (
          <div className="detail-grid" style={{ marginTop: "16px" }}>
            <div className="detail-item">
              <span className="detail-label">Alert status</span>
              <strong className="detail-value">{alert}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Instructor alert</span>
              <strong className="detail-value">
                {dangerState ? "READY" : "standby"}
              </strong>
            </div>
          </div>
        )}
      </div>
    ),

    motion: (
      <div
        className={`panel motion-orientation-card ${
          isDetailMode && activeCard === "motion" ? "is-expanded" : ""
        }`}
        onClick={() => !isDetailMode && openCard("motion")}
      >
        <div className="panel-header-log">
          <div className="panel-title-group">
            <span className="panel-kicker">BMI160 Motion Analysis</span>
            <span className="panel-title">Accelerație pe axe</span>
          </div>
        </div>

        <div className="motion-bars">
          <MotionAxisBar label="AX" value={accX} unit="G" maxAbs={3} />
          <MotionAxisBar label="AY" value={accY} unit="G" maxAbs={3} />
          <MotionAxisBar label="AZ" value={accZ} unit="G" maxAbs={3} />
        </div>

        <div className="axis-mini-grid">
          <div>
            Total <strong>{formatValue(accTotal, 2, "G")}</strong>
          </div>
          <div>
            GX <strong>{formatValue(gyroX, 1, "°/s")}</strong>
          </div>
          <div>
            GY <strong>{formatValue(gyroY, 1, "°/s")}</strong>
          </div>
        </div>

        <div className="axis-mini-grid">
          <div>
            GZ <strong>{formatValue(gyroZ, 1, "°/s")}</strong>
          </div>
          <div>
            Free fall{" "}
            <strong>{motionData.freeFallRisk ? "YES" : "NO"}</strong>
          </div>
          <div>
            Rotation{" "}
            <strong>{motionData.excessiveRotation ? "YES" : "NO"}</strong>
          </div>
        </div>

        {isDetailMode && activeCard === "motion" && (
          <div className="detail-grid" style={{ marginTop: "16px" }}>
            <div className="detail-item">
              <span className="detail-label">Acc X</span>
              <strong className="detail-value">
                {formatValue(accX, 2, " G")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Acc Y</span>
              <strong className="detail-value">
                {formatValue(accY, 2, " G")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Acc Z</span>
              <strong className="detail-value">
                {formatValue(accZ, 2, " G")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Acc Total</span>
              <strong className="detail-value">
                {formatValue(accTotal, 2, " G")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gyro X</span>
              <strong className="detail-value">
                {formatValue(gyroX, 1, "°/s")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gyro Y</span>
              <strong className="detail-value">
                {formatValue(gyroY, 1, "°/s")}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gyro Z</span>
              <strong className="detail-value">
                {formatValue(gyroZ, 1, "°/s")}
              </strong>
            </div>
          </div>
        )}
      </div>
    ),

    current: (
      <GraphCard
        title="curent"
        liveValue={current !== null ? current.toFixed(2) : "--"}
        liveUnit="mA"
        minLabel={formatValue(currentMin, 2, "mA")}
        maxLabel={formatValue(currentMax, 2, "mA")}
        footerLabel={
          components.ina219.online ? "curent live" : "sensor INA219 offline"
        }
        values={safeCurrentHistory}
        ticks={currentScale.ticks}
        color="#52ab98"
        minValue={currentChartMin}
        maxValue={currentChartMax}
        darkMode={darkMode}
        expanded={isDetailMode && activeCard === "current"}
        onToggle={() => openCard("current")}
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
        kicker="Sistem"
        title="CPU Load"
        badge="CPU"
        mainValue={cpuLoadPercent !== null ? cpuLoadPercent.toFixed(0) : "--"}
        mainUnit="%"
        progress={cpuLoadPercent ?? 0}
        subtext="ESP load estimat în timp real"
        expanded={isDetailMode && activeCard === "cpu"}
        onToggle={() => openCard("cpu")}
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
            value: current !== null ? `${current.toFixed(2)} mA` : "--",
          },
          {
            label: "Sensor",
            value: components.ina219.online ? "online" : "offline",
          },
        ]}
        expanded={isDetailMode && activeCard === "voltage"}
        onToggle={() => openCard("voltage")}
      />
    ),

    battery: (
      <MetricCard
        kicker="Starea bateriei"
        title="Baterie wearable"
        badge="BAT"
        mainValue={batteryPercent !== null ? batteryPercent.toFixed(0) : "--"}
        mainUnit="%"
        miniStats={[
          {
            label: "Instant",
            value: current !== null ? `${current.toFixed(2)} mA` : "--",
          },
          {
            label: "Autonomie",
            value: batteryLifeH !== null ? `${batteryLifeH.toFixed(1)} h` : "--",
          },
        ]}
        progress={batteryPercent ?? 0}
        progressClassName="battery-fill"
        subtext={`Tensiune: ${
          voltage !== null ? `${voltage.toFixed(2)} V` : "--"
        }`}
        expanded={isDetailMode && activeCard === "battery"}
        onToggle={() => openCard("battery")}
      />
    ),

    modules: (
      <ModulesCard
        oled={oled}
        oledOnline={components.oled.online}
        modules={modules}
        expanded={isDetailMode && activeCard === "modules"}
        onToggle={() => openCard("modules")}
      />
    ),
  };

  const detailOrder = [
    { id: "mission", label: "Mission Status" },
    { id: "parachute", label: "Parachute Events" },
    { id: "danger", label: "Danger AI" },
    { id: "motion", label: "Motion Axes" },
    { id: "pulse", label: "Pulse" },
    { id: "spo2", label: "SpO₂" },
    { id: "temperature", label: "Body Temp" },
    { id: "risk", label: "Risk Prediction" },
    { id: "network", label: "Connectivity" },
    { id: "battery", label: "Battery" },
    { id: "cpu", label: "CPU Load" },
    { id: "voltage", label: "Voltage" },
    { id: "current", label: "Current" },
    { id: "modules", label: "Modules" },
    { id: "logs", label: "Alert Log" },
  ];

  if (isDetailMode) {
    return (
      <>
        <section className="detail-mode-layout">
          <div className="detail-main-column">
            <div className="detail-main-toolbar">
              <button
                type="button"
                className="detail-back-button"
                onClick={closeDetailMode}
              >
                Back to mission dashboard
              </button>
            </div>

            <div className="detail-main-card">{cards[activeCard]}</div>
          </div>

          <aside className="detail-sidebar">
            <div className="detail-sidebar-title">Mission Cards</div>

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
      <section className="level level-top">
        {cards.mission}
        {cards.parachute}
      </section>

      <section className="level level-top">
        {cards.pulse}
        {cards.spo2}
      </section>

      <section className="level level-top">
        {cards.temperature}
        {cards.risk}
      </section>

      <section className="level level-auto">
        {cards.danger}
        {cards.motion}
      </section>

      <section className="bottom-grid">
        {cards.battery}
        {cards.network}
        {cards.cpu}
        {cards.voltage}
        {cards.modules}
        {cards.logs}
      </section>
    </>
  );
}