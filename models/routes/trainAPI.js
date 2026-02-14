const express = require("express");
const Train = require("../train");

const trainNames = [
  "Rajdhani Express",
  "Shatabdi Express",
  "Duronto Express",
  "Garib Rath",
  "Intercity Express",
  "Vande Bharat",
  "Jan Shatabdi",
  "Tejas Express",
  "Sampark Kranti",
  "Humsafar Express",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (num) => String(num).padStart(2, "0");
const randomTime = () => {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 60);
  return `${pad(h)}:${pad(m)}`;
};
const randomEngine = () => {
  const types = ["WAP-7", "WAP-5", "WAG-9", "WDP-4D"];
  const type = pick(types);
  const num = 30000 + Math.floor(Math.random() * 9000);
  return `${type} ${num}`;
};
const randomPlatform = () => String(1 + Math.floor(Math.random() * 12));

const generateTrainsForRoute = (from, to, count = 8) =>
  Array.from({ length: count }, (_, i) => {
    const baseName = pick(trainNames);
    const name = `${from.split(" ")[0]} ${baseName}`;
    const number = String(12000 + Math.floor(Math.random() * 7000) + i);
    return {
      name,
      number,
      engineNumber: randomEngine(),
      fromCity: from,
      toCity: to,
      departureTime: randomTime(),
      arrivalTime: randomTime(),
      platform: randomPlatform(),
      classes: {
        ac: Math.random() > 0.2,
        sleeper: Math.random() > 0.1,
        general: true,
      },
    };
  });

const router = express.Router();
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const TRAIN_PROVIDER_URL = String(process.env.TRAIN_PROVIDER_URL || "").trim();
const TRAIN_PROVIDER_KEY = String(process.env.TRAIN_PROVIDER_KEY || "").trim();

const getCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  return cached.value;
};

const setCache = (key, value, ttlMs = CACHE_TTL_MS) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeTrain = (item, from, to, index = 0) => {
  const classes = item?.classes || item?.availableClasses || {};
  return {
    name:
      item?.name ||
      item?.trainName ||
      item?.operator ||
      `${from.split(" ")[0]} Express`,
    number: String(
      item?.number ||
        item?.trainNumber ||
        item?.id ||
        12000 + index
    ),
    engineNumber:
      item?.engineNumber ||
      item?.engine ||
      randomEngine(),
    fromCity: item?.fromCity || item?.from || from,
    toCity: item?.toCity || item?.to || to,
    departureTime: item?.departureTime || item?.depart || randomTime(),
    arrivalTime: item?.arrivalTime || item?.arrival || randomTime(),
    platform: String(item?.platform || item?.platformNumber || randomPlatform()),
    classes: {
      ac: Boolean(classes.ac ?? classes.AC ?? true),
      sleeper: Boolean(classes.sleeper ?? classes.SL ?? true),
      general: Boolean(classes.general ?? classes.GN ?? true),
    },
  };
};

const fetchLiveTrains = async (from, to) => {
  if (!TRAIN_PROVIDER_URL) return null;
  try {
    const axios = require("axios");
    const response = await axios.get(TRAIN_PROVIDER_URL, {
      timeout: 8000,
      params: { from, to, limit: 12 },
      headers: TRAIN_PROVIDER_KEY
        ? {
            Authorization: `Bearer ${TRAIN_PROVIDER_KEY}`,
            "x-api-key": TRAIN_PROVIDER_KEY,
          }
        : {},
    });
    const rows = asArray(
      response?.data?.trains ||
        response?.data?.data ||
        response?.data?.results
    );
    const normalized = rows
      .map((item, idx) => normalizeTrain(item, from, to, idx))
      .filter((item) => item.name && item.number);
    return normalized.length ? normalized.slice(0, 12) : null;
  } catch {
    return null;
  }
};

router.get("/", async (req, res) => {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    const cacheKey = `trains:${from.toLowerCase()}:${to.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached && Array.isArray(cached.trains) && cached.trains.length) {
      res.set("Cache-Control", "public, max-age=300");
      return res.json(cached);
    }

    const liveTrains = await fetchLiveTrains(from, to);
    if (liveTrains && liveTrains.length) {
      const payload = { trains: liveTrains, source: "provider" };
      setCache(cacheKey, payload);
      res.set("Cache-Control", "public, max-age=300");
      return res.json(payload);
    }

    const query = {
      fromCity: new RegExp(`^${from}$`, "i"),
      toCity: new RegExp(`^${to}$`, "i"),
    };
    let trains = await Train.find(query).sort({ createdAt: -1 }).limit(12);

    let results = trains;
    if (!results.length) {
      const generated = generateTrainsForRoute(from, to, 8);
      try {
        results = await Train.insertMany(generated);
      } catch {
        results = generated;
      }
    }

    const payload = { trains: results, source: "fallback" };
    setCache(cacheKey, payload);
    res.set("Cache-Control", "public, max-age=300");
    res.json(payload);
  } catch (error) {
    console.error("Train fetch error:", error);
    res.status(500).json({ error: "Failed to load trains" });
  }
});

module.exports = router;
