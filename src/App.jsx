import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const HISTORY_POINTS = 30;
const SAMPLE_INTERVAL = 1000;

function makeSeries(count, base, variation, decimals = 1) {
  return Array.from({ length: count }, (_, i) => {
    const val = base + Math.sin(i / 4) * variation;
    return Number(val.toFixed(decimals));
  });
}

function makeLightSeries(count, base, variation) {
  return Array.from({ length: count }, (_, i) =>
    Math.round(base + Math.sin(i / 4) * variation)
  );
}

function getNiceScale(min, max, step = 5) {
  const niceMax = Math.ceil(max / step) * step;
  const niceMin = Math.floor(min / step) * step;

  const ticks = [];
  for (let v = niceMin; v <= niceMax; v += step) {
    ticks.push(v);
  }

  return { niceMin, niceMax, ticks };
}

function LiveTickerChart({
  values,
  color,
  minValue,
  maxValue,
  darkMode,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const animationRef = useRef(null);

  const previousValuesRef = useRef(values);
  const currentValuesRef = useRef(values);
  const transitionStartRef = useRef(performance.now());

  useEffect(() => {
    previousValuesRef.current = currentValuesRef.current;
    currentValuesRef.current = values;
    transitionStartRef.current = performance.now();

    const draw = (now) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const progress = Math.min(
        1,
        (now - transitionStartRef.current) / SAMPLE_INTERVAL
      );

      const curr = currentValuesRef.current;

      const stepX = width / (HISTORY_POINTS - 1);
      const shiftX = stepX * progress;

      const topPad = 8;
      const bottomPad = 8;
      const usableHeight = height - topPad - bottomPad;
      const range = maxValue - minValue || 1;

      const toY = (value) =>
        topPad + (1 - (value - minValue) / range) * usableHeight;

      const drawLine = (series, offsetX) => {
        ctx.beginPath();

        for (let i = 0; i < series.length; i++) {
          const x = i * stepX - offsetX;
          const y = toY(series[i]);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (i - 1) * stepX - offsetX;
            const prevY = toY(series[i - 1]);
            const midX = (prevX + x) / 2;

            ctx.bezierCurveTo(midX, prevY, midX, y, x, y);
          }
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        const lastIndex = series.length - 1;
        const lastX = lastIndex * stepX - offsetX;
        const lastY = toY(series[lastIndex]);

        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };

      const bg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(43,103,119,0.06)";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawLine(curr, shiftX);

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationRef.current);
  }, [values, color, minValue, maxValue, darkMode]);

  return (
    <div ref={wrapRef} className="chart-canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const [temperatureData, setTemperatureData] = useState(
    makeSeries(HISTORY_POINTS, 24.2, 0.7, 1)
  );
  const [lightData, setLightData] = useState(
    makeLightSeries(HISTORY_POINTS, 620, 80)
  );

  const [temperatureLive, setTemperatureLive] = useState(24.2);
  const [lightLive, setLightLive] = useState(620);

  const [ioLog, setIoLog] = useState([]);

  const [wireless, setWireless] = useState({
    connected: false,
    ssid: "--",
    ip: "--",
    mac: "--",
    rssi: { value: 0, unit: "dBm" },
    signalLevel: "--",
  });

  const [cpuLoad, setCpuLoad] = useState({ value: 0, unit: "%" });
  const [voltage, setVoltage] = useState({ value: 0, unit: "V" });
  const [currentNow, setCurrentNow] = useState({ value: 0, unit: "mA" });
  const [currentTotal, setCurrentTotal] = useState({ value: 0, unit: "mAh" });
  const [battery, setBattery] = useState({
    capacity: 0,
    capacityUnit: "mAh",
    percent: 0,
    estimatedLife: { value: 0, unit: "h" },
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:4000/api/data");
        const data = await response.json();

        if (data.wireless) setWireless(data.wireless);
        if (data.ioLog) setIoLog(data.ioLog.slice(-20));

        if (data.system?.cpuLoad) setCpuLoad(data.system.cpuLoad);

        if (data.power?.voltage) setVoltage(data.power.voltage);
        if (data.power?.currentNow) setCurrentNow(data.power.currentNow);
        if (data.power?.currentTotal) setCurrentTotal(data.power.currentTotal);
        if (data.power?.battery) setBattery(data.power.battery);

        if (data.temperature?.value != null) {
          const nextTemp = Number(data.temperature.value.toFixed(1));
          setTemperatureLive(nextTemp);
          setTemperatureData((prev) => [...prev.slice(1), nextTemp]);
        }

        if (data.light?.value != null) {
          const nextLight = Math.round(data.light.value);
          setLightLive(nextLight);
          setLightData((prev) => [...prev.slice(1), nextLight]);
        }
      } catch (err) {
        console.error("Backend error:", err);
      }
    }, SAMPLE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const tempMin = Math.min(...temperatureData).toFixed(1);
  const tempMax = Math.max(...temperatureData).toFixed(1);
  const lightMin = Math.min(...lightData);
  const lightMax = Math.max(...lightData);

  const tempScale = getNiceScale(
    Math.min(...temperatureData),
    Math.max(...temperatureData),
    5
  );

  const lightScale = getNiceScale(
    Math.min(...lightData),
    Math.max(...lightData),
    100
  );

  const tempChartMin = useMemo(
    () => Math.floor((Math.min(...temperatureData) - 1) * 10) / 10,
    [temperatureData]
  );

  const tempChartMax = useMemo(
    () => Math.ceil((Math.max(...temperatureData) + 1) * 10) / 10,
    [temperatureData]
  );

  const lightChartMin = useMemo(
    () => Math.max(0, Math.floor(Math.min(...lightData) - 80)),
    [lightData]
  );

  const lightChartMax = useMemo(
    () => Math.ceil(Math.max(...lightData) + 80),
    [lightData]
  );

  const signalPercent = (() => {
    const rssi = wireless?.rssi?.value ?? -100;

    if (rssi >= -50) return 100;
    if (rssi <= -90) return 10;

    return Math.round(((rssi + 90) / 40) * 90 + 10);
  })();

  return (
    <div className={darkMode ? "app dark" : "app light"}>
      <div className="dashboard">
        <h1>ESP32 Dashboard</h1>

        <section className="level">
          <div className="panel panel-large graph-panel">
            <div className="graph-top-left">
              <span className="graph-small-label">max</span>
              <span className="graph-small-value">{tempMax} °C</span>
            </div>

            <div className="graph-live-value">
              <span className="live-number">{temperatureLive.toFixed(1)}</span>
              <span className="live-unit">°C</span>
            </div>

            <div className="graph-area">
              <div className="y-scale">
                {tempScale.ticks
                  .slice()
                  .reverse()
                  .map((t) => (
                    <span key={t}>{t}</span>
                  ))}
              </div>

              <LiveTickerChart
                values={temperatureData}
                color={darkMode ? "#c8d8e4" : "#2b6777"}
                minValue={tempChartMin}
                maxValue={tempChartMax}
                darkMode={darkMode}
              />
            </div>

            <div className="graph-bottom">
              <div className="graph-bottom-left">
                <span className="graph-small-label">min</span>
                <span className="graph-small-value">{tempMin} °C</span>
                <span className="graph-small-label live-under-min">
                  temperatura live
                </span>
              </div>

              <div className="graph-bottom-right"></div>
            </div>
          </div>

          <div className="panel panel-large graph-panel">
            <div className="graph-top-left">
              <span className="graph-small-label">max</span>
              <span className="graph-small-value">{lightMax} lx</span>
            </div>

            <div className="graph-live-value">
              <span className="live-number">{lightLive}</span>
              <span className="live-unit">lx</span>
            </div>

            <div className="graph-area">
              <div className="y-scale">
                {lightScale.ticks
                  .slice()
                  .reverse()
                  .map((t) => (
                    <span key={t}>{t}</span>
                  ))}
              </div>

              <LiveTickerChart
                values={lightData}
                color="#52ab98"
                minValue={lightChartMin}
                maxValue={lightChartMax}
                darkMode={darkMode}
              />
            </div>

            <div className="graph-bottom">
              <div className="graph-bottom-left">
                <span className="graph-small-label">min</span>
                <span className="graph-small-value">{lightMin} lx</span>
                <span className="graph-small-label live-under-min">
                  lumina live
                </span>
              </div>

              <div className="graph-bottom-right"></div>
            </div>
          </div>
        </section>

        <section className="level">
          <div className="panel panel-wide log-panel">
            <div className="panel-header panel-header-log">
              <div className="panel-title-group">
                <span className="panel-kicker">Monitorizare</span>
                <span className="panel-title">Log în timp real</span>
              </div>

              <span className="log-badge">LIVE</span>
            </div>

            <div className="log-container">
              {ioLog.map((line, index) => (
                <div key={index} className="log-line">
                  [{line.timestamp}] {line.message}
                </div>
              ))}
            </div>
          </div>

          <div className="panel panel-wide network-panel">
            <div className="panel-header panel-header-log">
              <div className="panel-title-group">
                <span className="panel-kicker">Conectivitate</span>
                <span className="panel-title">Semnal & rețea</span>
              </div>

              <span className="log-badge">Wi-Fi</span>
            </div>

            <div className="network-content">
              <div className="network-row">
                <span>Status</span>
                <strong>{wireless.connected ? "Conectat" : "Deconectat"}</strong>
              </div>

              <div className="network-row">
                <span>SSID</span>
                <strong>{wireless.ssid}</strong>
              </div>

              <div className="network-row">
                <span>IP</span>
                <strong>{wireless.ip}</strong>
              </div>

              <div className="network-row">
                <span>MAC</span>
                <strong>{wireless.mac}</strong>
              </div>

              <div className="network-row">
                <span>RSSI</span>
                <strong>
                  {wireless.rssi.value} {wireless.rssi.unit}
                </strong>
              </div>

              <div className="network-row">
                <span>Semnal</span>
                <strong>{wireless.signalLevel}</strong>
              </div>

              <div className="signal-bar">
                <div
                  className="signal-fill"
                  style={{ width: `${signalPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        <section className="level">
          <div className="panel stat-panel">
            <div className="panel-header panel-header-log">
              <div className="panel-title-group">
                <span className="panel-kicker">Procesare</span>
                <span className="panel-title">CPU Load</span>
              </div>

              <span className="log-badge">CPU</span>
            </div>

            <div className="stat-main">
              <span className="stat-number">{cpuLoad.value}</span>
              <span className="stat-unit">{cpuLoad.unit}</span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, cpuLoad.value))}%` }}
              ></div>
            </div>
          </div>

          <div className="panel stat-panel">
            <div className="panel-header panel-header-log">
              <div className="panel-title-group">
                <span className="panel-kicker">Alimentare</span>
                <span className="panel-title">Tensiune</span>
              </div>

              <span className="log-badge">VCC</span>
            </div>

            <div className="stat-main">
              <span className="stat-number">{voltage.value}</span>
              <span className="stat-unit">{voltage.unit}</span>
            </div>

            <div className="stat-subtext">Tensiune instant măsurată</div>
          </div>
        </section>

        <section className="level">
          <div className="panel stat-panel">
            <div className="panel-header panel-header-log">
              <div className="panel-title-group">
                <span className="panel-kicker">Consum</span>
                <span className="panel-title">Curent consumat</span>
              </div>

              <span className="log-badge">mA</span>
            </div>

            <div className="dual-stats">
              <div className="mini-stat">
                <span className="mini-label">Instant</span>
                <span className="mini-value">
                  {currentNow.value} {currentNow.unit}
                </span>
              </div>

              <div className="mini-stat">
                <span className="mini-label">Total</span>
                <span className="mini-value">
                  {currentTotal.value} {currentTotal.unit}
                </span>
              </div>
            </div>
          </div>

          <div className="panel stat-panel">
            <div className="panel-header panel-header-log">
              <div className="panel-title-group">
                <span className="panel-kicker">Autonomie</span>
                <span className="panel-title">Durata bateriei</span>
              </div>

              <span className="log-badge">BAT</span>
            </div>

            <div className="stat-main">
              <span className="stat-number">{battery.estimatedLife?.value}</span>
              <span className="stat-unit">{battery.estimatedLife?.unit}</span>
            </div>

            <div className="battery-row">
              <span>Baterie</span>
              <strong>{battery.percent}%</strong>
            </div>

            <div className="progress-bar battery-bar">
              <div
                className="progress-fill battery-fill"
                style={{ width: `${Math.max(0, Math.min(100, battery.percent))}%` }}
              ></div>
            </div>

            <div className="stat-subtext">
              Capacitate: {battery.capacity} {battery.capacityUnit}
            </div>
          </div>
        </section>
      </div>

      <button
        className="theme-toggle"
        onClick={() => setDarkMode(!darkMode)}
      >
        {darkMode ? "Light Mode" : "Dark Mode"}
      </button>
    </div>
  );
}

export default App;