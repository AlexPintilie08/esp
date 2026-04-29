import { useEffect, useMemo, useState } from "react";

function n(value, fallback = 0) {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}

function MiniGraph({ values = [], color = "#00d2ff", min = null, max = null }) {
  const safe = values.filter((v) => Number.isFinite(v)).slice(-120);

  const graphMin = min ?? Math.min(...safe, 0);
  const graphMax = max ?? Math.max(...safe, 1);
  const range = graphMax - graphMin || 1;

  const points = safe
    .map((v, i) => {
      const x = safe.length <= 1 ? 0 : (i / (safe.length - 1)) * 100;
      const y = 100 - ((v - graphMin) / range) * 100;
      return `${x},${Math.max(0, Math.min(100, y))}`;
    })
    .join(" ");

  return (
    <svg className="flight-mini-graph" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" />
    </svg>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flight-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LogGraphCard({ title, value, unit, values, color, min, max }) {
  return (
    <div className="panel flight-card">
      <div className="panel-header-log">
        <div className="panel-title-group">
          <span className="panel-kicker">Flight Log</span>
          <span className="panel-title">{title}</span>
        </div>
      </div>

      <div className="flight-card-value">
        {value}
        <span>{unit}</span>
      </div>

      <MiniGraph values={values} color={color} min={min} max={max} />
    </div>
  );
}

export default function FlightLogView({ backendIp }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");

  const apiBase = useMemo(() => {
    const raw = String(backendIp || "").trim();

    if (!raw) return "http://localhost:4000";

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw.replace(/\/+$/, "");
    }

    return `http://${raw.replace(/\/+$/, "")}`;
  }, [backendIp]);

  const loadLog = async () => {
    try {
      const res = await fetch(`${apiBase}/api/flight-log`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setEntries(Array.isArray(json.data) ? json.data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Flight log fetch failed");
    }
  };

  const clearLog = async () => {
    const ok = confirm("Ștergi toate logurile de zbor?");
    if (!ok) return;

    try {
      await fetch(`${apiBase}/api/flight-log`, { method: "DELETE" });
      await loadLog();
    } catch (err) {
      setError(err.message || "Clear failed");
    }
  };

  useEffect(() => {
    loadLog();
    const id = setInterval(loadLog, 3000);
    return () => clearInterval(id);
  }, [apiBase]);

  const stats = useMemo(() => {
    const bpm = entries.map((e) => n(e?.physiology?.bpm));
    const spo2 = entries.map((e) => n(e?.physiology?.spo2));
    const temp = entries.map((e) => n(e?.physiology?.bodyTemperature));
    const risk = entries.map((e) => n(e?.ai?.riskScore));
    const acc = entries.map((e) => n(e?.motion?.accTotal));
    const ax = entries.map((e) => n(e?.motion?.accX));
    const ay = entries.map((e) => n(e?.motion?.accY));
    const az = entries.map((e) => n(e?.motion?.accZ));

    const max = (arr) => (arr.length ? Math.max(...arr) : 0);
    const min = (arr) => (arr.length ? Math.min(...arr) : 0);
    const last = (arr) => (arr.length ? arr[arr.length - 1] : 0);

    return {
      bpm,
      spo2,
      temp,
      risk,
      acc,
      ax,
      ay,
      az,
      maxBpm: max(bpm),
      minSpo2: min(spo2.filter((v) => v > 0)),
      maxRisk: max(risk),
      maxAcc: max(acc),
      lastBpm: last(bpm),
      lastSpo2: last(spo2),
      lastTemp: last(temp),
      lastRisk: last(risk),
      lastAcc: last(acc),
    };
  }, [entries]);

  const latest = entries[entries.length - 1];

  return (
    <section className="flight-log-page">
      <div className="panel flight-hero">
        <div>
          <span className="panel-kicker">Post Flight Analysis</span>
          <h2>Flight Log</h2>
          <p>
            Date salvate din telefon prin BLE bridge. Total sample-uri:{" "}
            <strong>{entries.length}</strong>
          </p>
        </div>

        <div className="flight-actions">
          <button onClick={loadLog}>Refresh</button>
          <button onClick={clearLog}>Clear log</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="flight-stats-grid">
        <Stat label="Max BPM" value={`${stats.maxBpm.toFixed(0)} BPM`} />
        <Stat label="Min SpO₂" value={`${stats.minSpo2.toFixed(0)}%`} />
        <Stat label="Max risk" value={`${stats.maxRisk.toFixed(0)}%`} />
        <Stat label="Max accel" value={`${stats.maxAcc.toFixed(2)}G`} />
      </div>

      <section className="flight-graphs-grid">
        <LogGraphCard
          title="Puls"
          value={stats.lastBpm.toFixed(0)}
          unit="BPM"
          values={stats.bpm}
          color="#ef4444"
          min={0}
          max={160}
        />

        <LogGraphCard
          title="Oxigen sânge"
          value={stats.lastSpo2.toFixed(0)}
          unit="%"
          values={stats.spo2}
          color="#00d2ff"
          min={85}
          max={100}
        />

        <LogGraphCard
          title="Temperatură"
          value={stats.lastTemp.toFixed(1)}
          unit="°C"
          values={stats.temp}
          color="#f59e0b"
          min={20}
          max={42}
        />

        <LogGraphCard
          title="Risk AI"
          value={stats.lastRisk.toFixed(0)}
          unit="%"
          values={stats.risk}
          color="#52ab98"
          min={0}
          max={100}
        />

        <LogGraphCard
          title="Accel total"
          value={stats.lastAcc.toFixed(2)}
          unit="G"
          values={stats.acc}
          color="#22c55e"
          min={0}
          max={3}
        />

        <LogGraphCard
          title="Accel X"
          value={(stats.ax.at(-1) ?? 0).toFixed(2)}
          unit="G"
          values={stats.ax}
          color="#00d2ff"
          min={-2}
          max={2}
        />

        <LogGraphCard
          title="Accel Y"
          value={(stats.ay.at(-1) ?? 0).toFixed(2)}
          unit="G"
          values={stats.ay}
          color="#f59e0b"
          min={-2}
          max={2}
        />

        <LogGraphCard
          title="Accel Z"
          value={(stats.az.at(-1) ?? 0).toFixed(2)}
          unit="G"
          values={stats.az}
          color="#ef4444"
          min={-2}
          max={2}
        />
      </section>

      <div className="panel flight-table-card">
        <div className="panel-header-log">
          <div className="panel-title-group">
            <span className="panel-kicker">Events</span>
            <span className="panel-title">Ultimele intrări</span>
          </div>
        </div>

        <div className="flight-table">
          {entries.slice(-20).reverse().map((e) => (
            <div className="flight-row" key={e.logId || e.isoTimestamp}>
              <span>{e.timestamp || "--"}</span>
              <strong>{e.ai?.alert || "--"}</strong>
              <span>BPM {e.physiology?.bpm ?? "--"}</span>
              <span>SpO₂ {e.physiology?.spo2 ?? "--"}%</span>
              <span>Risk {e.ai?.riskScore ?? "--"}%</span>
              <span>Acc {Number(e.motion?.accTotal ?? 0).toFixed(2)}G</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}