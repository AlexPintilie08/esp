import { useState } from "react";
import "./App.css";

import BondHero from "./components/BondHero";
import DashboardShell from "./components/DashboardShell";
import useEspData from "./hooks/useEspData";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  const [activeCard, setActiveCard] = useState(null);

  const {
    data,
    error,
    backendIp,
    setBackendIp,
    temperatureHistory,
    currentHistory,
  } = useEspData();

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("darkMode", String(next));
      return next;
    });
  };

  const handleChangeIp = () => {
    const nextIp = prompt("ESP IP:", backendIp);
    if (!nextIp) return;

    const cleaned = nextIp.trim();
    if (!cleaned) return;

    setBackendIp(cleaned);
    localStorage.setItem("backendIp", cleaned);
  };

  const openCard = (cardId) => {
    setActiveCard(cardId);
  };

  const closeDetailMode = () => {
    setActiveCard(null);
  };

  const isBondDetail = activeCard === "bond";

  return (
    <div className={darkMode ? "app dark" : "app light"}>
      <div className="dashboard">
        <BondHero
          data={data}
          expanded={isBondDetail}
          onToggle={() => openCard("bond")}
          onClose={closeDetailMode}
        />

        {!isBondDetail ? (
          <DashboardShell
            data={data}
            error={error}
            darkMode={darkMode}
            temperatureHistory={temperatureHistory}
            currentHistory={currentHistory}
            activeCard={activeCard}
            setActiveCard={setActiveCard}
          />
        ) : null}
      </div>

      <button className="theme-toggle" onClick={toggleTheme}>
        {darkMode ? "Light Mode" : "Dark Mode"}
      </button>

      <button
        className="ip-toggle"
        onClick={handleChangeIp}
        title="Schimbă IP backend"
      >
        IP: {backendIp}
      </button>
    </div>
  );
}

export default App;