const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let latestEspPayload = null;
let currentTotalmAh = 142.0;
let ioHistory = [];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max, decimals = 0) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function generateTimestamp() {
  return new Date().toLocaleTimeString("ro-RO");
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

function signalLevelFromRSSI(rssi) {
  if (rssi > -55) return "Excelent";
  if (rssi > -67) return "Bun";
  return "Slab";
}

function buildResponseFromEsp(raw) {
  const lRaw = Number(raw.lRaw ?? 0);
  const tRaw = Number(raw.tRaw ?? 0);
  const vRaw = Number(raw.vRaw ?? 0);
  const iRaw = Number(raw.iRaw ?? 0);

  const luxValue = Math.round(((255 - lRaw) / 255) * 1000);
  const temperatureValue = Number((19.5 + (235 - tRaw) * 0.3).toFixed(1));
  const voltageValue = Number(vRaw.toFixed(2));
  const currentNowValue = Number(iRaw.toFixed(1));

  currentTotalmAh += currentNowValue / 3600;
  currentTotalmAh = Number(currentTotalmAh.toFixed(2));

  const batteryPercent = clamp(
    Math.round(((voltageValue - 3.3) / (4.2 - 3.3)) * 100),
    0,
    100
  );

  const estimatedLifeHours =
    currentNowValue > 1
      ? Number((2000 / currentNowValue).toFixed(1))
      : 0;

  const rssi =
    typeof raw.rssi === "number"
      ? raw.rssi
      : randomBetween(-72, -45, 0);

  const cpuLoad =
    typeof raw.cpuLoad === "number"
      ? Number(raw.cpuLoad.toFixed(1))
      : randomBetween(12, 24, 1);

  const ssid = raw.ssid || "ESP32-C3";
  const ip = raw.ip || "192.168.1.55";
  const mac = raw.mac || "ESP32-C3";
  const connected =
    typeof raw.connected === "boolean" ? raw.connected : true;

  const messageParts = [
    `LDR=${lRaw}`,
    `NTC=${tRaw}`,
    `V=${voltageValue}V`,
    `I=${currentNowValue}mA`,
  ];

  if (typeof raw.btnNext !== "undefined") {
    messageParts.push(`BTN_NEXT=${raw.btnNext}`);
  }
  if (typeof raw.btnPrev !== "undefined") {
    messageParts.push(`BTN_PREV=${raw.btnPrev}`);
  }

  pushIoLog(messageParts.join(", "));

  return {
    timestamp: generateTimestamp(),

    temperature: {
      value: temperatureValue,
      unit: "°C",
    },

    light: {
      value: luxValue,
      unit: "lx",
    },

    ioLog: ioHistory,

    wireless: {
      connected,
      ssid,
      ip,
      mac,
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
        value: voltageValue,
        unit: "V",
      },
      currentNow: {
        value: currentNowValue,
        unit: "mA",
      },
      currentTotal: {
        value: currentTotalmAh,
        unit: "mAh",
      },
      battery: {
        capacity: 2000,
        capacityUnit: "mAh",
        percent: batteryPercent,
        estimatedLife: {
          value: estimatedLifeHours,
          unit: "h",
        },
      },
    },
  };
}

function buildFallbackResponse() {
  const temperature = randomBetween(23.4, 26.8, 1);
  const light = randomBetween(380, 820, 0);
  const rssi = randomBetween(-72, -45, 0);
  const cpuLoad = randomBetween(18, 64, 1);
  const voltage = randomBetween(3.72, 4.18, 2);
  const currentNow = randomBetween(62, 128, 0);

  currentTotalmAh += currentNow / 3600;
  currentTotalmAh = Number(currentTotalmAh.toFixed(2));

  const batteryCapacitymAh = 2000;
  const estimatedBatteryLifeHours = Number(
    (batteryCapacitymAh / currentNow).toFixed(1)
  );

  const batteryPercent = clamp(
    Math.round(((voltage - 3.3) / (4.2 - 3.3)) * 100),
    0,
    100
  );

  ioHistory.unshift({
    timestamp: generateTimestamp(),
    message: `IO2=${Math.random() > 0.5 ? 1 : 0}, IO3=${
      Math.random() > 0.5 ? 1 : 0
    }, IO4=${Math.random() > 0.5 ? 1 : 0}`,
  });

  if (ioHistory.length > 20) {
    ioHistory = ioHistory.slice(0, 20);
  }

  return {
    timestamp: generateTimestamp(),

    temperature: {
      value: temperature,
      unit: "°C",
    },

    light: {
      value: light,
      unit: "lx",
    },

    ioLog: ioHistory,

    wireless: {
      connected: true,
      ssid: "ESP32_LAB",
      ip: "192.168.1.55",
      mac: "A4:C1:38:7B:92:10",
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
      currentTotal: {
        value: currentTotalmAh,
        unit: "mAh",
      },
      battery: {
        capacity: batteryCapacitymAh,
        capacityUnit: "mAh",
        percent: batteryPercent,
        estimatedLife: {
          value: estimatedBatteryLifeHours,
          unit: "h",
        },
      },
    },
  };
}

app.get("/", (req, res) => {
  res.send("ESP backend running");
});

app.post("/api/esp-update", (req, res) => {
  const { lRaw, tRaw, vRaw, iRaw } = req.body || {};

  if (
    lRaw === undefined ||
    tRaw === undefined ||
    vRaw === undefined ||
    iRaw === undefined
  ) {
    console.log("POST INVALID /api/esp-update");
    console.log(req.body);

    return res.status(400).json({
      ok: false,
      error: "Payload invalid",
      received: req.body,
    });
  }

  latestEspPayload = req.body;

  console.log("ESP UPDATE RECEIVED:");
  console.log(JSON.stringify(latestEspPayload, null, 2));

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});