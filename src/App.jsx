import { useState } from "react";
import "./App.css";

import DashboardShell from "./components/DashboardShell";
import FlightLogView from "./components/FlightLogView";
import useEspData from "./hooks/useEspData";
import useBleWearable from "./hooks/useBleWearable";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  const [activeCard, setActiveCard] = useState(null);
  const [viewMode, setViewMode] = useState("live");

  const {
    data,
    error,
    backendIp,
    setBackendIp,
    temperatureHistory,
    currentHistory,
    bpmHistory,
    spo2History,
    riskHistory,
  } = useEspData();

  const {
    connect,
    disconnect,
    connected,
    scanning,
    bleLiveData,
  } = useBleWearable();

  const dashboardData = connected && bleLiveData ? bleLiveData : data;

  const risk = dashboardData?.ai?.riskScore ?? 0;
  const systemState = risk >= 70 ? "danger" : risk >= 40 ? "warning" : "safe";

  const systemLabel =
    systemState === "danger"
      ? "EMERGENCY"
      : systemState === "warning"
      ? "CAUTION"
      : "STABLE";

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("darkMode", String(next));
      return next;
    });
  };

  const handleChangeIp = () => {
    const nextIp = prompt("Backend IP:", backendIp);
    if (!nextIp) return;

    const cleaned = nextIp.trim();
    if (!cleaned) return;

    setBackendIp(cleaned);
    localStorage.setItem("backendIp", cleaned);
  };

  return (
    <div className={`app ${darkMode ? "dark" : "light"} state-${systemState}`}>
      <div className="dashboard">
        <header className="dashboard-header">
          <div>
            <h1>
              SKYSAFE <span>monitor</span>
            </h1>

            <p className="header-sub">
              Live web = ESP Wi-Fi · Android = BLE local monitor · Flight log = backend file
            </p>
          </div>

          <div className="header-status">
            <div className="view-switcher">
              <button
                type="button"
                className={viewMode === "live" ? "active" : ""}
                onClick={() => setViewMode("live")}
              >
                Live Dashboard
              </button>

              <button
                type="button"
                className={viewMode === "log" ? "active" : ""}
                onClick={() => setViewMode("log")}
              >
                Flight Log
              </button>
            </div>

            <button
              type="button"
              className={`ble-chip ${connected ? "connected" : ""}`}
              onClick={connected ? disconnect : connect}
            >
              {connected
                ? "WEARABLE CONNECTED"
                : scanning
                ? "SEARCHING..."
                : "CONNECT WEARABLE"}
            </button>

            <div className={`status-pill ${systemState}`}>
              {systemLabel}
            </div>

            <button
              type="button"
              className="backend-chip"
              onClick={handleChangeIp}
            >
              {backendIp}
            </button>
          </div>
        </header>

        {error && viewMode === "live" && (
          <div className="error-banner">{error}</div>
        )}

        {viewMode === "live" ? (
          <DashboardShell
            data={dashboardData}
            backendIp={backendIp}
            error={error}
            darkMode={darkMode}
            temperatureHistory={temperatureHistory}
            currentHistory={currentHistory}
            bpmHistory={bpmHistory}
            spo2History={spo2History}
            riskHistory={riskHistory}
            activeCard={activeCard}
            setActiveCard={setActiveCard}
          />
        ) : (
          <FlightLogView backendIp={backendIp} />
        )}
      </div>

      <button className="theme-toggle" onClick={toggleTheme}>
        {darkMode ? "☀️" : "🌙"}
      </button>

      <button className="ip-toggle" onClick={handleChangeIp}>
        {backendIp}
      </button>
    </div>
  );
}

export default App;