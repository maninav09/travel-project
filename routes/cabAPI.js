// Purpose: returns cab options from live providers when available, otherwise generated fallback data.
const express = require("express");
const Cab = require("../models/cab");

const providers = ["Uber", "Ola", "Rapido Cabs", "CityCab", "QuickRide", "Mega Taxi"];
const vehicleTypes = ["Mini", "Sedan", "SUV", "Prime Sedan", "Prime SUV"];
const carModels = [
  "WagonR",
  "Swift Dzire",
  "Hyundai Aura",
  "Ertiga",
  "Innova",
  "XUV700",
  "Baleno",
];
const driverNames = [
  "Aman",
  "Rahul",
  "Sandeep",
  "Vikas",
  "Praveen",
  "Nitin",
  "Mohit",
  "Deepak",
  "Rohit",
  "Karan",
  "Arjun",
  "Ravi",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (num) => String(num).padStart(2, "0");
const randomTime = () => {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 60);
  return `${pad(h)}:${pad(m)}`;
};
const randomFare = () => 700 + Math.floor(Math.random() * 2800);
const randomSeats = () => 4 + Math.floor(Math.random() * 3);
const randomRating = () => Number((3.8 + Math.random() * 1.2).toFixed(1));

const generateCabsForRoute = (from, to, count = 100) =>
  Array.from({ length: count }, () => ({
    provider: pick(providers),
    vehicleType: pick(vehicleTypes),
    carModel: pick(carModels),
    fromCity: from,
    toCity: to,
    pickupTime: randomTime(),
    eta: `${15 + Math.floor(Math.random() * 120)} mins`,
    seats: randomSeats(),
    fare: randomFare(),
    driverName: pick(driverNames),
    driverRating: randomRating(),
  }));

const router = express.Router();
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const RESPONSE_LIMIT = 6;
const CAB_PROVIDER_URL = String(process.env.CAB_PROVIDER_URL || "").trim();
const CAB_PROVIDER_KEY = String(process.env.CAB_PROVIDER_KEY || "").trim();

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

const uniqueCabs = (items) => {
  const seen = new Set();
  const unique = [];

  for (const cab of items) {
    const key = [
      cab?.provider,
      cab?.vehicleType,
      cab?.carModel,
      cab?.fromCity,
      cab?.toCity,
      cab?.pickupTime,
      cab?.fare,
      cab?.driverName,
    ]
      .map((v) => String(v || "").toLowerCase().trim())
      .join("|");

    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(cab);
  }

  return unique;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCab = (item, from, to) => ({
  provider: item?.provider || item?.operator || "CityCab",
  vehicleType: item?.vehicleType || item?.type || "Sedan",
  carModel: item?.carModel || item?.model || pick(carModels),
  fromCity: item?.fromCity || item?.from || from,
  toCity: item?.toCity || item?.to || to,
  pickupTime: item?.pickupTime || item?.departureTime || randomTime(),
  eta: item?.eta || `${15 + Math.floor(Math.random() * 120)} mins`,
  seats: Number(item?.seats || item?.capacity || randomSeats()),
  fare: Number(item?.fare || item?.price || randomFare()),
  driverName: item?.driverName || item?.driver || pick(driverNames),
  driverRating: Number(item?.driverRating || item?.rating || randomRating()),
});

const fetchLiveCabs = async (from, to) => {
  if (!CAB_PROVIDER_URL) return null;
  try {
    const axios = require("axios");
    const response = await axios.get(CAB_PROVIDER_URL, {
      timeout: 8000,
      params: { from, to, limit: RESPONSE_LIMIT },
      headers: CAB_PROVIDER_KEY
        ? {
            Authorization: `Bearer ${CAB_PROVIDER_KEY}`,
            "x-api-key": CAB_PROVIDER_KEY,
          }
        : {},
    });
    const rows = asArray(
      response?.data?.cabs ||
        response?.data?.data ||
        response?.data?.results
    );
    const normalized = uniqueCabs(
      rows.map((item) => normalizeCab(item, from, to))
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

    const cacheKey = `cabs:${from.toLowerCase()}:${to.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached && Array.isArray(cached.cabs) && cached.cabs.length) {
      res.set("Cache-Control", "public, max-age=300");
      return res.json(cached);
    }

    const liveCabs = await fetchLiveCabs(from, to);
    if (liveCabs && liveCabs.length) {
      const payload = { cabs: liveCabs, source: "provider" };
      setCache(cacheKey, payload);
      res.set("Cache-Control", "public, max-age=300");
      return res.json(payload);
    }

    const query = {
      fromCity: new RegExp(`^${from}$`, "i"),
      toCity: new RegExp(`^${to}$`, "i"),
    };

    let cabs = [];
    try {
      cabs = await Cab.find(query).sort({ createdAt: -1 }).limit(50);
    } catch {
      cabs = [];
    }

    let results = uniqueCabs(cabs);
    if (results.length < RESPONSE_LIMIT) {
      const generated = generateCabsForRoute(from, to, 30);
      try {
        const inserted = await Cab.insertMany(generated);
        results = uniqueCabs(results.concat(inserted));
      } catch {
        results = uniqueCabs(results.concat(generated));
      }
    }

    const payload = { cabs: results.slice(0, RESPONSE_LIMIT), source: "fallback" };
    setCache(cacheKey, payload);
    res.set("Cache-Control", "public, max-age=300");
    res.json(payload);
  } catch (error) {
    console.error("Cab fetch error:", error);
    res.status(500).json({ error: "Failed to load cabs" });
  }
});

module.exports = router;
