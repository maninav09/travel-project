// Purpose: returns bus options from live providers when available, otherwise seeded fallback data.
const express = require("express");
const Bus = require("../models/bus");

const operators = [
  "RedBus Connect",
  "InterCity Lines",
  "GoBus Travels",
  "Skyline Coaches",
  "MetroRide",
  "State Express",
  "Comfort Wheels",
  "Nightline Tours",
];

const busTypes = ["AC Sleeper", "Volvo AC", "Semi Sleeper", "Non-AC Sleeper", "Seater AC"];
const boardingPoints = [
  "Main Bus Stand",
  "Central Depot",
  "City Mall Stop",
  "Railway Junction Gate",
  "Airport Road Point",
  "Ring Road Plaza",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (num) => String(num).padStart(2, "0");
const randomTime = () => {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 60);
  return `${pad(h)}:${pad(m)}`;
};
const randomFare = () => 500 + Math.floor(Math.random() * 2200);
const randomSeats = () => 4 + Math.floor(Math.random() * 36);

const generateBusesForRoute = (from, to, count = 100) =>
  Array.from({ length: count }, (_, i) => ({
    operator: pick(operators),
    busNumber: `BUS-${1000 + i}-${Math.floor(Math.random() * 90 + 10)}`,
    type: pick(busTypes),
    fromCity: from,
    toCity: to,
    departureTime: randomTime(),
    arrivalTime: randomTime(),
    boardingPoint: pick(boardingPoints),
    seatsAvailable: randomSeats(),
    fare: randomFare(),
  }));

const router = express.Router();
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const RESPONSE_LIMIT = 6;
const BUS_PROVIDER_URL = String(process.env.BUS_PROVIDER_URL || "").trim();
const BUS_PROVIDER_KEY = String(process.env.BUS_PROVIDER_KEY || "").trim();

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

const uniqueBuses = (items) => {
  const seen = new Set();
  const unique = [];

  for (const bus of items) {
    const key = [
      bus?.operator,
      bus?.busNumber,
      bus?.type,
      bus?.fromCity,
      bus?.toCity,
      bus?.departureTime,
      bus?.arrivalTime,
      bus?.fare,
    ]
      .map((v) => String(v || "").toLowerCase().trim())
      .join("|");

    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(bus);
  }

  return unique;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeBus = (item, from, to, index = 0) => ({
  operator: item?.operator || item?.provider || "InterCity Lines",
  busNumber: String(item?.busNumber || item?.number || `BUS-${1000 + index}`),
  type: item?.type || item?.busType || "AC Sleeper",
  fromCity: item?.fromCity || item?.from || from,
  toCity: item?.toCity || item?.to || to,
  departureTime: item?.departureTime || item?.depart || randomTime(),
  arrivalTime: item?.arrivalTime || item?.arrival || randomTime(),
  boardingPoint: item?.boardingPoint || item?.boarding || pick(boardingPoints),
  seatsAvailable: Number(item?.seatsAvailable || item?.seats || randomSeats()),
  fare: Number(item?.fare || item?.price || randomFare()),
});

const fetchLiveBuses = async (from, to) => {
  if (!BUS_PROVIDER_URL) return null;
  try {
    const axios = require("axios");
    const response = await axios.get(BUS_PROVIDER_URL, {
      timeout: 8000,
      params: { from, to, limit: RESPONSE_LIMIT },
      headers: BUS_PROVIDER_KEY
        ? {
            Authorization: `Bearer ${BUS_PROVIDER_KEY}`,
            "x-api-key": BUS_PROVIDER_KEY,
          }
        : {},
    });
    const rows = asArray(
      response?.data?.buses ||
        response?.data?.data ||
        response?.data?.results
    );
    const normalized = uniqueBuses(
      rows.map((item, idx) => normalizeBus(item, from, to, idx))
    ).slice(0, RESPONSE_LIMIT);
    return normalized.length ? normalized : null;
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

    const cacheKey = `buses:${from.toLowerCase()}:${to.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached && Array.isArray(cached.buses) && cached.buses.length) {
      res.set("Cache-Control", "public, max-age=300");
      return res.json(cached);
    }

    const liveBuses = await fetchLiveBuses(from, to);
    if (liveBuses && liveBuses.length) {
      const payload = { buses: liveBuses, source: "provider" };
      setCache(cacheKey, payload);
      res.set("Cache-Control", "public, max-age=300");
      return res.json(payload);
    }

    const query = {
      fromCity: new RegExp(`^${from}$`, "i"),
      toCity: new RegExp(`^${to}$`, "i"),
    };

    let buses = [];
    try {
      buses = await Bus.find(query).sort({ createdAt: -1 }).limit(50);
    } catch {
      buses = [];
    }

    let results = uniqueBuses(buses);
    if (results.length < RESPONSE_LIMIT) {
      const generated = generateBusesForRoute(from, to, 30);
      try {
        const inserted = await Bus.insertMany(generated);
        results = uniqueBuses(results.concat(inserted));
      } catch {
        results = uniqueBuses(results.concat(generated));
      }
    }

    const payload = { buses: results.slice(0, RESPONSE_LIMIT), source: "fallback" };
    setCache(cacheKey, payload);
    res.set("Cache-Control", "public, max-age=300");
    res.json(payload);
  } catch (error) {
    console.error("Bus fetch error:", error);
    res.status(500).json({ error: "Failed to load buses" });
  }
});

module.exports = router;
