
// Purpose: handles route planning, durations, saved routes, and AI-generated trip details.
const express = require("express");
const axios = require("axios");
const Route = require("../models/route");

const {
  ensureRoutes,
  isIncomplete,
  normalizeMode,
} = require("../services/routePlacesService");

const router = express.Router();

/* Escape regex special characters */
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DISTANCE_KEY =
  process.env.DISTANCE_API_KEY ||
  process.env.DISTANCEAPI_KEY ||
  process.env.DISTANCE_APIKEY ||
  process.env.DISTANCE_MATRIX_API_KEY ||
  "";
const GEOAPIFY_MATRIX_KEY = (
  process.env.GEOAPIFY_MATRIX_API_KEY ||
  process.env.GEOAPIFYMATRIX_API_KEY ||
  process.env.GEOAPIFY_MATRIX_KEY ||
  process.env.GEOAPIFY_API_KEY ||
  process.env.GEOAPIFY_KEY ||
  ""
).trim();
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const USE_MONGO = process.env.USE_MONGO === "true";
const OPENAI_DISABLE_MS = 10 * 60 * 1000;
const OPENAI_WARN_COOLDOWN_MS = 60 * 1000;
let openaiDisabledUntil = 0;
let lastOpenaiWarnAt = 0;
const DURATION_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const durationCache = new Map();
const durationInFlight = new Map();

/* ---------- HELPERS ---------- */

const buildPhotoUrl = (photoRef) =>
  photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${photoRef}&key=${GOOGLE_KEY}`
    : "";

const buildDurationCacheKey = (from, to) =>
  `${String(from || "").trim().toLowerCase()}::${String(to || "")
    .trim()
    .toLowerCase()}`;

const getCachedDurationByMode = (key) => {
  const cached = durationCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    durationCache.delete(key);
    return null;
  }
  return cached.value;
};

const setCachedDurationByMode = (key, value, ttlMs = DURATION_CACHE_TTL_MS) => {
  durationCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const minutesToText = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  const parts = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (mins) parts.push(`${mins} min${mins === 1 ? "" : "s"}`);
  return parts.join(" ");
};

const parseDurationToMinutes = (value) => {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).toLowerCase();
  const dayMatch = text.match(/(\d+)\s*(d|day|days)\b/);
  const hourMatch = text.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b/);
  const minMatch = text.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  const days = dayMatch ? Number(dayMatch[1]) : 0;
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const mins = minMatch ? Number(minMatch[1]) : 0;
  const total = days * 24 * 60 + hours * 60 + mins;
  return total > 0 ? total : null;
};

const estimateCostRange = (mode, minutes) => {
  if (!minutes) return null;
  const hours = Math.max(minutes / 60, 0.5);
  const rateMap = {
    train: { min: 150, max: 320, base: 150 },
    bus: { min: 120, max: 240, base: 120 },
    cab: { min: 700, max: 1300, base: 800 },
  };
  const rates = rateMap[mode] || rateMap.train;
  const low = Math.max(rates.base, Math.round(hours * rates.min));
  const high = Math.max(rates.base + 200, Math.round(hours * rates.max));
  return { low, high, mid: Math.round((low + high) / 2) };
};

const geocodeTextWithNominatim = async (text) => {
  const q = String(text || "").trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    q
  )}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "travel-project/1.0 (route duration fallback)" },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const first = data?.[0];
  const lat = Number(first?.lat);
  const lon = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
};

const fetchDurationViaGeoapify = async (from, to, mode) => {
  if (!GEOAPIFY_MATRIX_KEY || !from || !to) return "";
  try {
    const [fromLoc, toLoc] = await Promise.all([
      geocodeTextWithNominatim(from),
      geocodeTextWithNominatim(to),
    ]);
    if (!fromLoc || !toLoc) return "";

    const response = await fetch(
      `https://api.geoapify.com/v1/routematrix?apiKey=${encodeURIComponent(
        GEOAPIFY_MATRIX_KEY
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "drive",
          sources: [{ location: [fromLoc.lon, fromLoc.lat] }],
          targets: [{ location: [toLoc.lon, toLoc.lat] }],
        }),
      }
    );
    if (!response.ok) return "";
    const data = await response.json();
    const timeSeconds = Number(data?.sources_to_targets?.[0]?.[0]?.time);
    if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) return "";

    const baseMinutes = timeSeconds / 60;
    const multipliers = {
      train: 1.15,
      bus: 1.25,
      cab: 1.0,
    };
    const normalizedMode = String(mode || "").toLowerCase();
    const adjusted =
      baseMinutes * (multipliers[normalizedMode] || multipliers.train);
    return minutesToText(adjusted);
  } catch {
    return "";
  }
};

const fetchDuration = async (from, to, mode) => {
  if (!from || !to) return "";
  try {
    if (!DISTANCE_KEY) {
      return await fetchDurationViaGeoapify(from, to, mode);
    }
    const params = {
      origins: from,
      destinations: to,
      key: DISTANCE_KEY,
      mode: mode === "cab" ? "driving" : "transit",
    };
    if (mode === "train" || mode === "bus") {
      params.transit_mode = mode;
      params.departure_time = "now";
    }
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      { params }
    );
    const apiStatus = response?.data?.status;
    if (apiStatus && apiStatus !== "OK") {
      console.warn(`Distance Matrix status (${mode}): ${apiStatus}`);
    }
    if (apiStatus === "REQUEST_DENIED" || apiStatus === "OVER_DAILY_LIMIT") {
      return await fetchDurationViaGeoapify(from, to, mode);
    }
    const element = response?.data?.rows?.[0]?.elements?.[0];
    if (element?.status === "OK" && element?.duration?.text) {
      return element.duration.text;
    }

    // Transit often returns ZERO_RESULTS on many city pairs.
    // Fall back to driving so duration is still available for comparison UI.
    if (mode !== "cab") {
      const drivingResponse = await axios.get(
        "https://maps.googleapis.com/maps/api/distancematrix/json",
        {
          params: {
            origins: from,
            destinations: to,
            key: DISTANCE_KEY,
            mode: "driving",
          },
        }
      );
      const drivingStatus = drivingResponse?.data?.status;
      if (drivingStatus && drivingStatus !== "OK") {
        console.warn(`Distance Matrix fallback status (${mode}->driving): ${drivingStatus}`);
      }
      const drivingElement = drivingResponse?.data?.rows?.[0]?.elements?.[0];
      if (drivingElement?.status === "OK" && drivingElement?.duration?.text) {
        return drivingElement.duration.text;
      }
    }

    if (element?.status && element.status !== "OK") {
      console.warn(`Distance Matrix element status (${mode}): ${element.status}`);
    }
    if (element?.duration?.text) return element.duration.text;
    return await fetchDurationViaGeoapify(from, to, mode);
  } catch (error) {
    console.error("Duration fetch error:", error.message);
    return await fetchDurationViaGeoapify(from, to, mode);
  }
};

const getDurationByMode = async (from, to) => {
  if (!from || !to) return { train: "", bus: "", cab: "" };
  const cacheKey = buildDurationCacheKey(from, to);
  const cached = getCachedDurationByMode(cacheKey);
  if (cached) return cached;

  if (durationInFlight.has(cacheKey)) {
    return durationInFlight.get(cacheKey);
  }

  const promise = (async () => {
    const [train, bus, cab] = await Promise.all([
      fetchDuration(from, to, "train"),
      fetchDuration(from, to, "bus"),
      fetchDuration(from, to, "cab"),
    ]);
    const value = { train, bus, cab };
    // Cache result (including partial/empty) to avoid repeated quota hits on refresh.
    setCachedDurationByMode(cacheKey, value);
    return value;
  })().finally(() => {
    durationInFlight.delete(cacheKey);
  });

  durationInFlight.set(cacheKey, promise);
  return promise;
};

const clampNumber = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
};

const toList = (value) => {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
};

const buildLocalPlan = ({ from, to, state, days, budget, interests, pace }) => {
  const dayCount = clampNumber(days || 3, 1, 10);
  const focus = interests.length ? interests.join(", ") : "culture, food, and local walks";
  const paceLabel = pace || "balanced";
  const baseTitle = `${to}${state ? `, ${state}` : ""}`;
  const itinerary = Array.from({ length: dayCount }, (_, idx) => {
    const day = idx + 1;
    return {
      day,
      title: day === 1 ? `Arrival and first impressions in ${baseTitle}` : `Day ${day} in ${baseTitle}`,
      blocks: [
        `Morning: Start with a relaxed neighborhood walk and a highlight spot tied to ${focus}.`,
        `Afternoon: Local market or landmark visit, plus a signature meal.`,
        `Evening: Sunset viewpoint or riverside stroll, then a casual cafe.`,
      ],
    };
  });
  return {
    title: `AI Trip Plan for ${baseTitle}`,
    summary: `A ${paceLabel} ${dayCount}-day plan from ${from} to ${baseTitle} focused on ${focus}.`,
    days: dayCount,
    pace: paceLabel,
    budget: budget || "mid-range",
    interests,
    itinerary,
    tips: [
      "Start early to avoid crowds at popular spots.",
      "Keep one flexible block each day for hidden finds.",
      "Carry light layers and refillable water.",
    ],
  };
};

const callOpenAIPlan = async ({ from, to, state, days, budget, interests, pace }) => {
  if (!OPENAI_KEY) return null;
  if (Date.now() < openaiDisabledUntil) return null;
  const dayCount = clampNumber(days || 3, 1, 10);
  const payload = {
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a travel planner. Return JSON only. Include keys: title, summary, days, pace, budget, interests, itinerary (array of {day,title,blocks}), tips (array).",
      },
      {
        role: "user",
        content:
          `Create a ${dayCount}-day itinerary from ${from} to ${to}${state ? `, ${state}` : ""}. ` +
          `Budget: ${budget || "mid-range"}. Pace: ${pace || "balanced"}. ` +
          `Interests: ${interests.length ? interests.join(", ") : "culture, food, nature"}. ` +
          "Return JSON only.",
      },
    ],
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const message = String(data?.error?.message || "OpenAI request failed");
      const lower = message.toLowerCase();
      const isQuota = lower.includes("quota") || lower.includes("billing");
      const isUnauthorized =
        response.status === 401 || lower.includes("invalid api key");

      if (isQuota || isUnauthorized) {
        openaiDisabledUntil = Date.now() + OPENAI_DISABLE_MS;
      }

      if (Date.now() - lastOpenaiWarnAt > OPENAI_WARN_COOLDOWN_MS) {
        console.warn(`OpenAI plan unavailable: ${message}`);
        lastOpenaiWarnAt = Date.now();
      }
      return null;
    }
    const content = data?.choices?.[0]?.message?.content || "";
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  } catch (error) {
    if (Date.now() - lastOpenaiWarnAt > OPENAI_WARN_COOLDOWN_MS) {
      console.warn(`OpenAI plan request failed: ${error?.message || "network error"}`);
      lastOpenaiWarnAt = Date.now();
    }
    return null;
  }
};

/* ---------- GET ROUTES ---------- */
router.get("/", async (req, res) => {
  try {
    const { mode, from, to } = req.query;
    if (!USE_MONGO) {
      if (!from || !to) return res.json({ routes: [] });
      const normalizedMode = normalizeMode(mode || "train");
      const prettyMode =
        normalizedMode.charAt(0).toUpperCase() + normalizedMode.slice(1);
      const durationByMode = await getDurationByMode(from, to);
      return res.json({
        routes: [
          {
            mode: prettyMode,
            from,
            to,
            summary: `A curated route from ${from} to ${to}.`,
            durationByMode,
            hotels: [],
            restaurants: [],
            places: [],
          },
        ],
      });
    }

    const query = {};

    if (mode) query.mode = new RegExp(`^${escapeRegex(mode)}$`, "i");
    if (from) query.from = new RegExp(escapeRegex(from), "i");
    if (to) query.to = new RegExp(escapeRegex(to), "i");

    let routes = await Route.find(query).sort({ createdAt: -1 }).limit(10);

    if (from && to) {
      if (!routes.length || routes.some(isIncomplete)) {
        routes = await ensureRoutes({ from, to, force: true });
      }
      if (mode) {
        const normalized = normalizeMode(mode);
        routes = routes.filter((r) => normalizeMode(r.mode) === normalized);
      }
    }

    // In Mongo mode, DB rows may miss durationByMode. Compute fresh values when query has from/to.
    if (from && to && routes.length) {
      const durationByMode = await getDurationByMode(from, to);
      const durationKey = normalizeMode(mode || routes[0]?.mode || "train");
      const enrichedRoutes = routes.map((route) => {
        const routeObj = route?.toObject ? route.toObject() : { ...route };
        return {
          ...routeObj,
          durationByMode: durationByMode,
          duration: routeObj.duration || durationByMode[durationKey] || "",
        };
      });
      return res.json({ routes: enrichedRoutes });
    }

    res.json({ routes });
  } catch (error) {
    console.error("Fetch routes error:", error);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});

router.get("/intelligence", async (req, res) => {
  try {
    const from = String(req.query?.from || "").trim();
    const to = String(req.query?.to || "").trim();
    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    const durationByMode = await getDurationByMode(from, to);
    const rows = ["train", "bus", "cab"].map((mode) => {
      const duration = durationByMode[mode] || "";
      const minutes = parseDurationToMinutes(duration);
      const cost = estimateCostRange(mode, minutes);
      return {
        mode,
        duration,
        minutes: minutes || null,
        cost,
      };
    });

    const available = rows.filter((r) => r.minutes && r.cost);
    const cheapest = available.length
      ? available.reduce((a, b) => (a.cost.mid <= b.cost.mid ? a : b))
      : null;
    const fastest = available.length
      ? available.reduce((a, b) => (a.minutes <= b.minutes ? a : b))
      : null;
    const balanced = available.length
      ? available.reduce((best, item) => {
          const score = item.minutes + item.cost.mid / 12;
          const bestScore = best.minutes + best.cost.mid / 12;
          return score < bestScore ? item : best;
        })
      : null;

    return res.json({
      from,
      to,
      generatedAt: new Date().toISOString(),
      durationByMode,
      insights: {
        cheapest: cheapest ? cheapest.mode : "",
        fastest: fastest ? fastest.mode : "",
        balanced: balanced ? balanced.mode : "",
      },
      estimates: rows.map((row) => ({
        mode: row.mode,
        duration: row.duration || "N/A",
        cost: row.cost ? `Rs ${row.cost.low} - Rs ${row.cost.high}` : "N/A",
      })),
    });
  } catch (error) {
    console.error("Route intelligence error:", error);
    return res.status(500).json({ error: "Unable to build route intelligence" });
  }
});

/* ---------- AI TRIP PLAN ---------- */
router.post("/plan", async (req, res) => {
  try {
    const from = String(req.body?.from || "").trim();
    const to = String(req.body?.to || "").trim();
    const state = String(req.body?.state || "").trim();
    const days = req.body?.days;
    const budget = String(req.body?.budget || "").trim();
    const pace = String(req.body?.pace || "").trim();
    const interests = toList(req.body?.interests);

    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    let plan = null;
    const fallback = buildLocalPlan({ from, to, state, days, budget, interests, pace });

    if (OPENAI_KEY) {
      try {
        plan = await callOpenAIPlan({ from, to, state, days, budget, interests, pace });
      } catch {
        plan = null;
      }
    }

    res.json({ plan: plan || fallback });
  } catch (error) {
    const safePlan = buildLocalPlan({
      from: String(req.body?.from || "").trim(),
      to: String(req.body?.to || "").trim(),
      state: String(req.body?.state || "").trim(),
      days: req.body?.days,
      budget: String(req.body?.budget || "").trim(),
      pace: String(req.body?.pace || "").trim(),
      interests: toList(req.body?.interests),
    });
    res.json({ plan: safePlan });
  }
});

/* ---------- EXPLORE ROUTE ---------- */
router.post("/explore", async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to)
      return res.status(400).json({ error: "from and to are required" });

    const directions = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: from,
          destination: to,
          key: GOOGLE_KEY,
        },
      }
    );

    const route = directions?.data?.routes?.[0];
    if (!route) return res.status(404).json({ error: "Route not found" });

    const midpoint = route.legs[0].start_location;
    const location = `${midpoint.lat},${midpoint.lng}`;

    const placesRes = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location,
          radius: 20000,
          key: GOOGLE_KEY,
        },
      }
    );

    const results = (placesRes.data.results || []).slice(0, 6).map((p) => ({
      name: p.name,
      rating: p.rating,
      image: buildPhotoUrl(p.photos?.[0]?.photo_reference),
      address: p.vicinity,
    }));

    res.json({ places: results });
  } catch (error) {
    console.error("Explore route error:", error);
    res.status(500).json({ error: "Failed to explore route" });
  }
});

/* ---------- SAVE ROUTE ---------- */
router.post("/", async (req, res) => {
  try {
    if (!USE_MONGO) {
      return res.status(201).json({ message: "Route saved (in-memory)", id: "local" });
    }
    const { mode, from, to, userEmail } = req.body;

    if (!mode || !from || !to)
      return res.status(400).json({ error: "mode, from, and to are required" });

    const saved = await Route.create({
      mode,
      from,
      to,
      userEmail: userEmail || "",
    });

    res.status(201).json({ message: "Route saved", id: saved._id });
  } catch (error) {
    console.error("Save route error:", error);
    res.status(500).json({ error: "Failed to save route" });
  }
});

module.exports = router;

