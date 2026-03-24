const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let currentTotalmAh = 142.0;

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

function generateIoLog() {
  const io2 = Math.random() > 0.5 ? 1 : 0;
  const io3 = Math.random() > 0.5 ? 1 : 0;
  const io4 = Math.random() > 0.5 ? 1 : 0;

  return {
    timestamp: generateTimestamp(),
    message: `IO2=${io2}, IO3=${io3}, IO4=${io4}`,
    io: {
      io2,
      io3,
      io4,
    },
  };
}

app.get("/api/data", (req, res) => {
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

  const ioLog = Array.from({ length: 8 }, generateIoLog);

  res.json({
    timestamp: generateTimestamp(),

    temperature: {
      value: temperature,
      unit: "°C",
    },

    light: {
      value: light,
      unit: "lx",
    },

    ioLog,

    wireless: {
      connected: true,
      ssid: "ESP32_LAB",
      ip: "192.168.1.55",
      mac: "A4:C1:38:7B:92:10",
      rssi: {
        value: rssi,
        unit: "dBm",
      },
      signalLevel: rssi > -55 ? "Excelent" : rssi > -67 ? "Bun" : "Slab",
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
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});