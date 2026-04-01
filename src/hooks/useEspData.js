import { useEffect, useState } from "react";
import { buildApiBase, DEFAULT_BACKEND_IP } from "../config";

const SAMPLE_INTERVAL = 1000;
const HISTORY_POINTS = 30;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pushHistory(prev, value) {
  return [...prev.slice(1), value];
}

export default function useEspData() {
  const [backendIp, setBackendIp] = useState(() => {
    return localStorage.getItem("backendIp") || DEFAULT_BACKEND_IP;
  });

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const [temperatureHistory, setTemperatureHistory] = useState(() =>
    Array(HISTORY_POINTS).fill(null)
  );

  const [currentHistory, setCurrentHistory] = useState(() =>
    Array(HISTORY_POINTS).fill(null)
  );

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await fetch(`${buildApiBase(backendIp)}/api/data`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (cancelled) return;

        setData(json);
        setError("");

        const nextTemp = toNumber(json?.telemetry?.temperature);
        const nextCurrent = toNumber(json?.telemetry?.current);

        if (nextTemp !== null) {
          setTemperatureHistory((prev) => pushHistory(prev, nextTemp));
        }

        if (nextCurrent !== null) {
          setCurrentHistory((prev) => pushHistory(prev, nextCurrent));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("ESP fetch error:", err);
        setError(err.message || "Request failed");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, SAMPLE_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [backendIp]);

  return {
    data,
    error,
    backendIp,
    setBackendIp,
    temperatureHistory,
    currentHistory,
  };
}