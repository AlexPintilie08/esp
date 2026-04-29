import { useRef, useState } from "react";
import { BleClient } from "@capacitor-community/bluetooth-le";

const SERVICE_UUID = "7b4a0001-9c7d-4f9a-bb2f-a1b2c3d4e001";
const CHAR_UUID = "7b4a0002-9c7d-4f9a-bb2f-a1b2c3d4e002";

const UI_UPDATE_MS = 50;
const BACKEND_SEND_MS = 150;

function buildApiBase(backendIp) {
  const raw = String(backendIp || "").trim();

  if (!raw) return "http://localhost:4000";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }

  return raw.includes(":")
    ? `http://${raw.replace(/\/+$/, "")}`
    : `http://${raw.replace(/\/+$/, "")}:4000`;
}

function isHexString(value) {
  return (
    typeof value === "string" &&
    value.length % 2 === 0 &&
    /^[0-9a-fA-F]+$/.test(value)
  );
}

function hexToText(hex) {
  let text = "";

  for (let i = 0; i < hex.length; i += 2) {
    text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }

  return text;
}

function decodeBleValue(value) {
  if (value?.value && typeof value.value === "string") {
    return isHexString(value.value) ? hexToText(value.value) : value.value;
  }

  if (typeof value === "string") {
    return isHexString(value) ? hexToText(value) : value;
  }

  if (value instanceof DataView) {
    return new TextDecoder("utf-8").decode(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }

  if (value?.buffer) {
    return new TextDecoder("utf-8").decode(value.buffer);
  }

  return "";
}

function boolValue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function compactSample(data) {
  return {
    t: new Date().toISOString(),

    bpm: Number(data.bpm ?? data.b ?? 0),
    spo2: Number(data.spo2 ?? data.o ?? 0),
    temp: Number(data.temp ?? data.c ?? 0),
    stress: data.stress || data.q || "NORMAL",

    risk: Number(data.risk ?? data.r ?? 0),
    status: data.status || data.s || "SAFE",
    pred: data.pred || data.p || "normal",

    ax: Number(data.ax ?? data.x ?? 0),
    ay: Number(data.ay ?? data.y ?? 0),
    az: Number(data.az ?? data.z ?? 0),
    at: Number(data.at ?? data.a ?? 0),

    gx: Number(data.gx ?? data.u ?? 0),
    gy: Number(data.gy ?? data.v2 ?? 0),
    gz: Number(data.gz ?? data.w ?? 0),

    bat: Number(data.bat ?? data.bt ?? data.battery ?? 0),
    v: Number(data.v ?? 0),
    i: Number(data.i ?? 0),

    parachute: boolValue(data.parachute ?? data.po),
    position: boolValue(data.position ?? data.pc),
    fall: boolValue(data.fall ?? data.f),
    rotation: boolValue(data.rotation ?? data.g),
    noMovement: boolValue(data.noMovement ?? data.n),

    connection: "BLE_PHONE",
  };
}

function sampleToDashboardData(sample) {
  return {
    timestamp: new Date(sample.t).toLocaleTimeString("ro-RO"),
    isoTimestamp: sample.t,

    status: sample.status,
    connection: "BLE_PHONE",

    wearable: {
      status: sample.status,
      connection: "BLE_PHONE",
    },

    health: {
      bpm: sample.bpm,
      spo2: sample.spo2,
      temperature: sample.temp,
      stress: sample.stress,
    },

    motion: {
      accX: sample.ax,
      accY: sample.ay,
      accZ: sample.az,
      accTotal: sample.at,

      gyroX: sample.gx,
      gyroY: sample.gy,
      gyroZ: sample.gz,

      parachuteOpened: sample.parachute,
      positionChanged: sample.position,
      freeFallRisk: sample.fall,
      excessiveRotation: sample.rotation,
      noMovement: sample.noMovement,
    },

    ai: {
      riskScore: sample.risk,
      prediction: sample.pred,
      alert: sample.status,
    },

    wireless: {
      connected: true,
      ssid: "BLE direct",
      ip: "--",
      mac: "--",
      rssi: -60,
      signalLevel: "BLE",
    },

    power: {
      voltage: sample.v,
      currentNow: sample.i,
      batteryPercent: sample.bat,
      estimatedLife: sample.i > 1 ? Number((2000 / sample.i).toFixed(1)) : 0,
    },

    system: {
      cpuLoad: 0,
    },

    logs: [
      {
        timestamp: new Date(sample.t).toLocaleTimeString("ro-RO"),
        message: `BLE live: BPM=${sample.bpm}, SpO2=${sample.spo2}, Risk=${sample.risk}, Status=${sample.status}`,
      },
    ],
  };
}

export default function useBleWearable(backendIp) {
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [bleLiveData, setBleLiveData] = useState(null);

  const connectingRef = useRef(false);
  const lastUiUpdateRef = useRef(0);
  const lastBackendSendRef = useRef(0);
  const scanTimeoutRef = useRef(null);

  const backendBaseRef = useRef(buildApiBase(backendIp));
  backendBaseRef.current = buildApiBase(backendIp);

  const postToBackend = async (sample) => {
    try {
      await fetch(`${backendBaseRef.current}/api/esp-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sample),
      });
    } catch {
      // backend poate fi offline; aplicația locală BLE merge oricum
    }
  };

  const notifyBackendDisconnect = async (reason = "BLE disconnected") => {
    try {
      await fetch(`${backendBaseRef.current}/api/bridge-disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
    } catch {
      // ignore
    }
  };

  const handleDisconnected = async (reason = "BLE disconnected") => {
    setConnected(false);
    setDeviceId(null);
    setScanning(false);
    setBleLiveData(null);
    connectingRef.current = false;

    await notifyBackendDisconnect(reason);
  };

  const connectToDevice = async (id) => {
    if (connectingRef.current) return;

    connectingRef.current = true;

    try {
      await BleClient.stopLEScan();
    } catch {
      // ignore
    }

    setScanning(false);

    await BleClient.connect(id, async () => {
      await handleDisconnected("BLE device disconnected");
    });

    setDeviceId(id);
    setConnected(true);
    connectingRef.current = false;

    await BleClient.startNotifications(id, SERVICE_UUID, CHAR_UUID, (value) => {
      try {
        const jsonStr = decodeBleValue(value);
        const parsed = JSON.parse(jsonStr);
        const sample = compactSample(parsed);

        const now = Date.now();

        if (now - lastUiUpdateRef.current >= UI_UPDATE_MS) {
          lastUiUpdateRef.current = now;
          setBleLiveData(sampleToDashboardData(sample));
        }

        if (now - lastBackendSendRef.current >= BACKEND_SEND_MS) {
          lastBackendSendRef.current = now;
          postToBackend(sample);
        }
      } catch (err) {
        console.log("BLE packet error:", err);
      }
    });
  };

  const connect = async () => {
    try {
      if (connected || connectingRef.current) return;

      setScanning(true);

      await BleClient.initialize();

      await BleClient.requestLEScan(
        { allowDuplicates: false },
        async (result) => {
          const id = result.device?.deviceId;
          if (!id) return;

          const name = result.device?.name || result.localName || "";
          const upperName = String(name).toUpperCase();

          const uuids = result.uuids || [];
          const hasOurService = uuids
            .map((u) => String(u).toLowerCase())
            .includes(SERVICE_UUID.toLowerCase());

          const target =
            hasOurService ||
            upperName.includes("ESP") ||
            upperName.includes("WEAR") ||
            upperName.includes("SKYSAFE");

          if (!target) return;

          await connectToDevice(id);
        }
      );

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      scanTimeoutRef.current = setTimeout(async () => {
        try {
          await BleClient.stopLEScan();
        } catch {
          // ignore
        }

        setScanning(false);
      }, 12000);
    } catch (err) {
      console.log("BLE connect error:", err);
      setConnected(false);
      setScanning(false);
      connectingRef.current = false;
    }
  };

  const disconnect = async () => {
    try {
      if (deviceId) {
        await BleClient.stopNotifications(deviceId, SERVICE_UUID, CHAR_UUID);
        await BleClient.disconnect(deviceId);
      }
    } catch {
      // ignore
    }

    await handleDisconnected("manual BLE disconnect");
  };

  return {
    connect,
    disconnect,
    connected,
    scanning,
    deviceId,
    bleLiveData,
  };
}