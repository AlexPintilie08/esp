import { useRef, useState } from "react";
import { BleClient } from "@capacitor-community/bluetooth-le";

const SERVICE_UUID = "7b4a0001-9c7d-4f9a-bb2f-a1b2c3d4e001";
const CHAR_UUID = "7b4a0002-9c7d-4f9a-bb2f-a1b2c3d4e002";

function decodeBleValue(value) {
  if (value?.buffer) {
    return new TextDecoder("utf-8").decode(value.buffer);
  }

  return new TextDecoder("utf-8").decode(value);
}

function compactSample(data) {
  return {
    t: new Date().toISOString(),
    b: Number(data.bpm ?? 0),
    o: Number(data.spo2 ?? 0),
    tc: Number(data.temp ?? 0),
    r: Number(data.risk ?? 0),

    ax: Number(data.ax ?? 0),
    ay: Number(data.ay ?? 0),
    az: Number(data.az ?? 0),
    at: Number(data.at ?? 0),

    gx: Number(data.gx ?? 0),
    gy: Number(data.gy ?? 0),
    gz: Number(data.gz ?? 0),

    s: data.status || "SAFE",
    p: data.pred || "normal",
    st: data.stress || "NORMAL",

    bt: Number(data.bat ?? data.battery ?? 0),
    v: Number(data.v ?? 0),
    i: Number(data.i ?? 0),

    po: Boolean(data.parachute),
    pc: Boolean(data.position),
    ff: Boolean(data.fall),
    er: Boolean(data.rotation),
    nm: Boolean(data.noMovement),
  };
}

function sampleToDashboardData(sample) {
  return {
    timestamp: new Date(sample.t).toLocaleTimeString("ro-RO"),
    isoTimestamp: sample.t,

    status: sample.s,
    connection: "BLE",

    health: {
      bpm: sample.b,
      spo2: sample.o,
      temperature: sample.tc,
      stress: sample.st,
    },

    motion: {
      accX: sample.ax,
      accY: sample.ay,
      accZ: sample.az,
      accTotal: sample.at,

      gyroX: sample.gx,
      gyroY: sample.gy,
      gyroZ: sample.gz,

      parachuteOpened: sample.po,
      positionChanged: sample.pc,
      freeFallRisk: sample.ff,
      excessiveRotation: sample.er,
      noMovement: sample.nm,
    },

    ai: {
      riskScore: sample.r,
      prediction: sample.p,
      alert: sample.s,
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
      batteryPercent: sample.bt,
      estimatedLife: sample.i > 1 ? Number((2000 / sample.i).toFixed(1)) : 0,
    },

    system: {
      cpuLoad: 0,
    },

    logs: [
      {
        timestamp: new Date(sample.t).toLocaleTimeString("ro-RO"),
        message: `BLE live: BPM=${sample.b}, SpO2=${sample.o}, Risk=${sample.r}, Status=${sample.s}`,
      },
    ],
  };
}

export default function useBleWearable() {
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [bleLiveData, setBleLiveData] = useState(null);

  const connectingRef = useRef(false);
  const lastUiUpdateRef = useRef(0);

  const connectToDevice = async (id) => {
    if (connectingRef.current || connected) return;

    connectingRef.current = true;

    await BleClient.stopLEScan();
    setScanning(false);

    await BleClient.connect(id);

    setDeviceId(id);
    setConnected(true);

    await BleClient.startNotifications(id, SERVICE_UUID, CHAR_UUID, (value) => {
      try {
        const jsonStr = decodeBleValue(value);
        const parsed = JSON.parse(jsonStr);
        const sample = compactSample(parsed);

        const now = Date.now();

        if (now - lastUiUpdateRef.current >= 80) {
          lastUiUpdateRef.current = now;
          setBleLiveData(sampleToDashboardData(sample));
        }
      } catch (err) {
        console.log("BLE packet error:", err);
      }
    });

    connectingRef.current = false;
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

      setTimeout(async () => {
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

    setConnected(false);
    setDeviceId(null);
    setScanning(false);
    connectingRef.current = false;
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