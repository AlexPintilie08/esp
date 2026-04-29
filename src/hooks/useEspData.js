import { useEffect, useState } from "react";
import { buildApiBase, DEFAULT_BACKEND_IP } from "../config";

const HISTORY_POINTS = 30;

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pushHistory(prev, value) {
  return [...prev.slice(1), value];
}

function normalizeEspData(raw) {
  if (!raw) return null;

  const physiology = raw.physiology || {};
  const motion = raw.motion || {};
  const ai = raw.ai || {};
  const wireless = raw.wireless || {};
  const system = raw.system || {};
  const power = raw.power || {};
  const wearable = raw.wearable || {};

  return {
    raw,
    timestamp: raw.timestamp || "--",
    status: wearable.status || ai.alert || "OFFLINE",
    connection: wearable.connection || "offline",

    health: {
      bpm: toNumber(physiology.bpm, 0),
      spo2: toNumber(physiology.spo2, 0),
      temperature: toNumber(physiology.bodyTemperature, 0),
      stress: physiology.stressLevel || "NO DATA",
    },

    motion: {
      accX: toNumber(motion.accX, 0),
      accY: toNumber(motion.accY, 0),
      accZ: toNumber(motion.accZ, 0),
      gyroX: toNumber(motion.gyroX, 0),
      gyroY: toNumber(motion.gyroY, 0),
      gyroZ: toNumber(motion.gyroZ, 0),
      accTotal: toNumber(motion.accTotal, 0),
      parachuteOpened: Boolean(motion.parachuteOpened),
      positionChanged: Boolean(motion.positionChanged),
      freeFallRisk: Boolean(motion.freeFallRisk),
      excessiveRotation: Boolean(motion.excessiveRotation),
      noMovement: Boolean(motion.noMovement),
    },

    ai: {
      riskScore: toNumber(ai.riskScore, 0),
      prediction: ai.prediction || "waiting",
      alert: ai.alert || wearable.status || "OFFLINE",
    },

    wireless: {
      connected: Boolean(wireless.connected),
      ssid: wireless.ssid || "--",
      ip: wireless.ip || "--",
      mac: wireless.mac || "--",
      rssi: toNumber(wireless.rssi?.value, -127),
      signalLevel: wireless.signalLevel || "Offline",
    },

    power: {
      voltage: toNumber(power.voltage?.value, 0),
      currentNow: toNumber(power.currentNow?.value, 0),
      batteryPercent: toNumber(power.battery?.percent ?? wearable.battery, 0),
      estimatedLife: toNumber(power.battery?.estimatedLife?.value, 0),
    },

    system: {
      cpuLoad: toNumber(system.cpuLoad?.value, 0),
    },

    logs: Array.isArray(raw.ioLog) ? raw.ioLog : [],
  };
}

export default function useEspData() {
  const [backendIp, setBackendIp] = useState(() => {
    return localStorage.getItem("backendIp") || DEFAULT_BACKEND_IP;
  });

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [temperatureHistory, setTemperatureHistory] = useState(() => Array(HISTORY_POINTS).fill(null));
  const [currentHistory, setCurrentHistory] = useState(() => Array(HISTORY_POINTS).fill(null));
  const [bpmHistory, setBpmHistory] = useState(() => Array(HISTORY_POINTS).fill(null));
  const [spo2History, setSpo2History] = useState(() => Array(HISTORY_POINTS).fill(null));
  const [riskHistory, setRiskHistory] = useState(() => Array(HISTORY_POINTS).fill(null));

  const applyData = (json) => {
    const normalized = normalizeEspData(json);
    setData(normalized);
    setError("");

    if (!normalized) return;

    setTemperatureHistory((prev) => pushHistory(prev, normalized.health.temperature));
    setCurrentHistory((prev) => pushHistory(prev, normalized.power.currentNow));
    setBpmHistory((prev) => pushHistory(prev, normalized.health.bpm));
    setSpo2History((prev) => pushHistory(prev, normalized.health.spo2));
    setRiskHistory((prev) => pushHistory(prev, normalized.ai.riskScore));
  };

  useEffect(() => {
    let cancelled = false;
    let ws = null;
    let fallbackInterval = null;

    const fetchFallback = async () => {
      try {
        const response = await fetch(`${buildApiBase(backendIp)}/api/data`, {
          cache: "no-store",
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        if (!cancelled) applyData(json);
      } catch (err) {
        if (!cancelled) setError(err.message || "Request failed");
      }
    };

    try {
      ws = new WebSocket(`ws://${backendIp}:4000`);

      ws.onopen = () => {
        if (!cancelled) setError("");
      };

      ws.onmessage = (event) => {
        try {
          const json = JSON.parse(event.data);
          if (!cancelled) applyData(json);
        } catch {
          // ignore bad websocket packet
        }
      };

      ws.onerror = () => {
        if (!cancelled) setError("WebSocket error, using HTTP fallback");
      };

      ws.onclose = () => {
        if (!cancelled) {
          fallbackInterval = setInterval(fetchFallback, 1000);
          fetchFallback();
        }
      };
    } catch {
      fallbackInterval = setInterval(fetchFallback, 1000);
      fetchFallback();
    }

    fetchFallback();

    return () => {
      cancelled = true;
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [backendIp]);

  return {
    data,
    error,
    backendIp,
    setBackendIp,
    temperatureHistory,
    currentHistory,
    bpmHistory,
    spo2History,
    riskHistory,
  };
}