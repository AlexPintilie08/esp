const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 4000;

console.log("SERVER FILE VERSION: FLIGHT LOG ENABLED");

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const LOG_FILE = path.join(__dirname, "flight_log.json");

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "2mb" }));

let latestEspPayload = null;
let ioHistory = [];

function generateTimestamp() {
  return new Date().toLocaleTimeString("ro-RO");
}

function generateIsoTimestamp() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function signalLevelFromRSSI(rssi) {
  if (rssi > -55) return "Excelent";
  if (rssi > -67) return "Bun";
  return "Slab";
}

function pushIoLog(message) {
  ioHistory.unshift({
    timestamp: generateTimestamp(),
    message,
  });

  if (ioHistory.length > 20) {
    ioHistory = ioHistory.slice(0, 20);
  }
}

function readFlightLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];

    const text = fs.readFileSync(LOG_FILE, "utf8");
    if (!text.trim()) return [];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.log("Flight log read error:", err.message);
    return [];
  }
}

function writeFlightLog(data) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
}

function appendFlightLog(entry) {
  const log = readFlightLog();

  log.push(entry);

  const trimmed = log.slice(-5000);

  writeFlightLog(trimmed);
}

function buildResponseFromEsp(raw) {
  const physiology = raw.physiology || {};
  const motion = raw.motion || {};
  const ai = raw.ai || {};
  const system = raw.system || {};
  const wireless = raw.wireless || {};
  const wearable = raw.wearable || {};

  const bpm = Number(physiology.bpm ?? 0);
  const spo2 = Number(physiology.spo2 ?? 0);
  const bodyTemperature = Number(physiology.bodyTemperature ?? 0);
  const stressLevel = physiology.stressLevel || "NORMAL";

  const voltage = Number(system.voltage?.value ?? 3.7);
  const currentNow = Number(system.currentNow?.value ?? 0);
  const batteryPercent = Number(
    system.battery?.percent ?? wearable.battery ?? 0
  );
  const cpuLoad = Number(system.cpuLoad?.value ?? 0);
  const rssi = Number(wireless.rssi?.value ?? -70);

  return {
    timestamp: generateTimestamp(),
    isoTimestamp: generateIsoTimestamp(),

    wearable: {
      status: wearable.status || ai.alert || "SAFE",
      battery: batteryPercent,
      connection: wearable.connection || "online",
    },

    physiology: {
      bpm,
      spo2,
      bodyTemperature,
      stressLevel,
    },

    motion: {
      accX: Number(motion.accX ?? 0),
      accY: Number(motion.accY ?? 0),
      accZ: Number(motion.accZ ?? 0),

      gyroX: Number(motion.gyroX ?? 0),
      gyroY: Number(motion.gyroY ?? 0),
      gyroZ: Number(motion.gyroZ ?? 0),

      accTotal: Number(motion.accTotal ?? 0),

      parachuteOpened: Boolean(motion.parachuteOpened),
      positionChanged: Boolean(motion.positionChanged),
      freeFallRisk: Boolean(motion.freeFallRisk),
      excessiveRotation: Boolean(motion.excessiveRotation),
      noMovement: Boolean(motion.noMovement),
    },

    ai: {
      riskScore: Number(ai.riskScore ?? 0),
      prediction: ai.prediction || "normal",
      alert: ai.alert || wearable.status || "SAFE",
    },

    wireless: {
      connected: Boolean(wireless.connected ?? true),
      ssid: wireless.ssid || "--",
      ip: wireless.ip || "--",
      mac: wireless.mac || "--",
      rssi: {
        value: rssi,
        unit: "dBm",
      },
      signalLevel: signalLevelFromRSSI(rssi),
    },

    system: {
      cpuLoad: {
        value: cpuLoad,
        unit: "%",
      },
    },

    power: {
      voltage: {
        value: voltage,
        unit: "V",
      },
      currentNow: {
        value: currentNow,
        unit: "mA",
      },
      battery: {
        capacity: 2000,
        capacityUnit: "mAh",
        percent: clamp(batteryPercent, 0, 100),
        estimatedLife: {
          value: currentNow > 1 ? Number((2000 / currentNow).toFixed(1)) : 0,
          unit: "h",
        },
      },
    },

    ioLog: ioHistory,
  };
}

function buildFallbackResponse() {
  return {
    timestamp: generateTimestamp(),
    isoTimestamp: generateIsoTimestamp(),

    wearable: {
      status: "OFFLINE",
      battery: 0,
      connection: "offline",
    },

    physiology: {
      bpm: 0,
      spo2: 0,
      bodyTemperature: 0,
      stressLevel: "NO DATA",
    },

    motion: {
      accX: 0,
      accY: 0,
      accZ: 0,

      gyroX: 0,
      gyroY: 0,
      gyroZ: 0,

      accTotal: 0,

      parachuteOpened: false,
      positionChanged: false,
      freeFallRisk: false,
      excessiveRotation: false,
      noMovement: false,
    },

    ai: {
      riskScore: 0,
      prediction: "waiting for ESP / phone bridge",
      alert: "OFFLINE",
    },

    wireless: {
      connected: false,
      ssid: "--",
      ip: "--",
      mac: "--",
      rssi: {
        value: -127,
        unit: "dBm",
      },
      signalLevel: "Offline",
    },

    system: {
      cpuLoad: {
        value: 0,
        unit: "%",
      },
    },

    power: {
      voltage: {
        value: 0,
        unit: "V",
      },
      currentNow: {
        value: 0,
        unit: "mA",
      },
      battery: {
        capacity: 2000,
        capacityUnit: "mAh",
        percent: 0,
        estimatedLife: {
          value: 0,
          unit: "h",
        },
      },
    },

    ioLog: ioHistory,
  };
}

function broadcastData(payload) {
  const message = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  const payload = latestEspPayload
    ? buildResponseFromEsp(latestEspPayload)
    : buildFallbackResponse();

  ws.send(JSON.stringify(payload));

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

app.get("/", (req, res) => {
  res.send("ESP wearable backend running - flight log enabled");
});

app.get("/api/esp-update", (req, res) => {
  res.send("ESP endpoint OK. Use POST.");
});

app.post("/api/esp-update", (req, res) => {
  latestEspPayload = req.body;

  const normalized = buildResponseFromEsp(latestEspPayload);

  const bpm = normalized.physiology.bpm;
  const spo2 = normalized.physiology.spo2;
  const risk = normalized.ai.riskScore;
  const alert = normalized.ai.alert;

  pushIoLog(
    `ESP update: BPM=${bpm}, SpO2=${spo2}, Risk=${risk}, Alert=${alert}`
  );

  const logEntry = {
    ...normalized,
    logId: Date.now(),
  };

  appendFlightLog(logEntry);
  broadcastData(normalized);

  console.log(
    `ESP UPDATE RECEIVED: BPM=${bpm}, SpO2=${spo2}, Risk=${risk}, Alert=${alert}`
  );

  res.json({
    ok: true,
    receivedAt: generateTimestamp(),
  });
});

app.get("/api/data", (req, res) => {
  if (!latestEspPayload) {
    return res.json(buildFallbackResponse());
  }

  return res.json(buildResponseFromEsp(latestEspPayload));
});

app.get("/api/flight-log", (req, res) => {
  const log = readFlightLog();

  res.json({
    ok: true,
    count: log.length,
    data: log,
  });
});

app.delete("/api/flight-log", (req, res) => {
  writeFlightLog([]);

  res.json({
    ok: true,
    message: "Flight log cleared",
  });
});
app.post("/api/flight-log-upload", (req, res) => {
  const samples = Array.isArray(req.body.samples) ? req.body.samples : [];

  for (const sample of samples) {
    appendFlightLog({
      ...sample,
      logId: Date.now() + Math.random(),
    });
  }

  res.json({
    ok: true,
    received: samples.length,
  });
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend + WebSocket running on http://0.0.0.0:${PORT}`);
});