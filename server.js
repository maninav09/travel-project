require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");

/* ROUTES */
const routeApi = require("./models/routes/routeAPI");
const authApi = require("./models/routes/authAPI");
const exploreRoutes = require("./models/routes/exploreRoute");
const trainApi = require("./models/routes/trainAPI");
const busApi = require("./models/routes/busAPI");
const cabApi = require("./models/routes/cabAPI");
const Newsletter = require("./models/newsletter");

const app = express();
console.log("Server file:", __filename);

/* ---------------- GLOBAL ERROR HANDLING ---------------- */
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE:", err);
});

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rateLimit = ({ windowMs, limit }) => {
  const store = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= limit) {
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
    }
    entry.count += 1;
    next();
  };
};

app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 80 }));

/* ---------------- PLACES (Geoapify) ---------------- */
const GEOAPIFY_KEY = (
  process.env.GEOAPIFY_API_KEY ||
  process.env.GEOAPIFY_KEY ||
  ""
).trim();
const USE_MONGO = process.env.USE_MONGO === "true";
const GOOGLE_KEY = (process.env.GOOGLE_MAPS_API_KEY || "").trim();
const PEXELS_KEY = (
  process.env.PEXELS_API_KEY ||
  process.env.pexels_API_KEY ||
  process.env.PEXELS_KEY ||
  ""
).trim();
const OPENAI_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
if (!GEOAPIFY_KEY) console.warn("Missing GEOAPIFY_API_KEY in .env");
if (!GOOGLE_KEY) console.warn("Missing GOOGLE_MAPS_API_KEY in .env");
if (!PEXELS_KEY) console.warn("Missing PEXELS_API_KEY in .env");

const geocodeWithGoogle = async (city) => {
  if (!GOOGLE_KEY) return null;
  const params = new URLSearchParams({ address: city, key: GOOGLE_KEY });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lon: loc.lng };
};

const geocodeWithGeoapify = async (city) => {
  if (!GEOAPIFY_KEY) return null;
  const params = new URLSearchParams({
    text: city,
    limit: "1",
    apiKey: GEOAPIFY_KEY,
  });
  const url = `https://api.geoapify.com/v1/geocode/search?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  return { lon: coords[0], lat: coords[1] };
};

const geocodeCity = async (city) => {
  const googleLoc = await geocodeWithGoogle(city);
  if (googleLoc) return googleLoc;

  const geoapifyLoc = await geocodeWithGeoapify(city);
  if (geoapifyLoc) return geoapifyLoc;

  // Fallback: OpenStreetMap Nominatim (no key required)
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    city
  )}`;
  const nominatimRes = await fetch(nominatimUrl, {
    headers: { "User-Agent": "travel-project/1.0 (student project)" },
  });
  if (!nominatimRes.ok) return null;
  const nominatimData = await nominatimRes.json();
  const first = nominatimData?.[0];
  if (!first?.lat || !first?.lon) return null;
  return { lon: Number(first.lon), lat: Number(first.lat) };
};

const weatherCodeMap = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

const weatherCache = new Map();
const getWeatherCache = (key) => {
  const cached = weatherCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    weatherCache.delete(key);
    return null;
  }
  return cached.value;
};
const setWeatherCache = (key, value, ttlMs = 15 * 60 * 1000) => {
  weatherCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const mapWeatherCode = (code) =>
  weatherCodeMap[code] || "Mixed conditions";

const buildWeatherFallback = (city, summary = "Weather unavailable") => ({
  forecast: {
    city,
    summary,
    currentTemp: "N/A",
    todayHigh: "N/A",
    todayLow: "N/A",
    currentCondition: summary,
  },
});

const newsletterSubscribers = new Set();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const analyticsEvents = [];
const allowedAnalyticsEvents = new Set([
  "route_search",
  "route_search_validation_error",
  "continue_route_click",
  "explore_click",
  "trending_tile_click",
  "saved_route_reuse",
  "newsletter_subscribe",
]);

const pexelsCache = new Map();
const getPexelsCache = (key) => {
  const cached = pexelsCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    pexelsCache.delete(key);
    return null;
  }
  return cached.value;
};
const setPexelsCache = (key, value, ttlMs = 30 * 60 * 1000) => {
  pexelsCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const defaultDestinationSuggestions = () => [
  {
    city: "Jaipur",
    state: "Rajasthan",
    tagline: "Traditional forts, local crafts, and royal streets.",
    mode: "Train",
    badges: ["Traditional", "Heritage"],
    wikipediaQuery: "Jaipur",
  },
  {
    city: "Varanasi",
    state: "Uttar Pradesh",
    tagline: "Religious ghats, temple rituals, and spiritual walks.",
    mode: "Train",
    badges: ["Religious Place", "Spiritual"],
    wikipediaQuery: "Varanasi",
  },
  {
    city: "Agra",
    state: "Uttar Pradesh",
    tagline: "Classic Indian tourist landmarks and old-city charm.",
    mode: "Cab",
    badges: ["Indian Tourist", "Monument"],
    wikipediaQuery: "Agra",
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    tagline: "Famous city skyline, sea views, and vibrant streets.",
    mode: "Bus",
    badges: ["Famous City", "Urban"],
    wikipediaQuery: "Mumbai",
  },
  {
    city: "Udaipur",
    state: "Rajasthan",
    tagline: "Lakeside palaces and old city lanes.",
    mode: "Train",
    badges: ["Heritage", "Romantic"],
    wikipediaQuery: "Udaipur",
  },
  {
    city: "Mysuru",
    state: "Karnataka",
    tagline: "Royal architecture and calm cultural streets.",
    mode: "Bus",
    badges: ["Culture", "Palace"],
    wikipediaQuery: "Mysore",
  },
  {
    city: "Amritsar",
    state: "Punjab",
    tagline: "Sacred landmarks and vibrant Punjabi food.",
    mode: "Train",
    badges: ["Religious Place", "Food"],
    wikipediaQuery: "Amritsar",
  },
  {
    city: "Kochi",
    state: "Kerala",
    tagline: "Coastal culture, cafes, and harbor views.",
    mode: "Cab",
    badges: ["Famous City", "Coastal"],
    wikipediaQuery: "Kochi",
  },
  {
    city: "Rishikesh",
    state: "Uttarakhand",
    tagline: "Riverfront walks and spiritual retreat vibes.",
    mode: "Bus",
    badges: ["Religious Place", "Nature"],
    wikipediaQuery: "Rishikesh",
  },
  {
    city: "Goa",
    state: "Goa",
    tagline: "Beaches, nightlife, and Portuguese heritage.",
    mode: "Cab",
    badges: ["Indian Tourist", "Coastal"],
    wikipediaQuery: "Goa",
  },
  {
    city: "Shimla",
    state: "Himachal Pradesh",
    tagline: "Hill views, colonial streets, and cool weather.",
    mode: "Bus",
    badges: ["Famous City", "Hill Station"],
    wikipediaQuery: "Shimla",
  },
  {
    city: "Jodhpur",
    state: "Rajasthan",
    tagline: "Blue city charm and massive hill forts.",
    mode: "Train",
    badges: ["Traditional", "Heritage"],
    wikipediaQuery: "Jodhpur",
  },
];

const normalizeSuggestionItem = (item) => {
  const city = String(item?.city || "").trim();
  if (!city) return null;
  const modeRaw = String(item?.mode || "Train").trim().toLowerCase();
  const mode = modeRaw === "bus" ? "Bus" : modeRaw === "cab" ? "Cab" : "Train";
  const state = String(item?.state || "India").trim();
  const tagline = String(item?.tagline || `Top places to explore in ${city}.`).trim();
  const badges = Array.isArray(item?.badges)
    ? item.badges.map((b) => String(b || "").trim()).filter(Boolean).slice(0, 2)
    : [];
  return {
    city,
    state: state || "India",
    tagline,
    mode,
    badges: badges.length ? badges : ["Popular", "Travel"],
    wikipediaQuery: String(item?.wikipediaQuery || city).trim(),
  };
};

const shuffleList = (items) => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

const pickUniqueSuggestions = (items, count = 4, excludeCities = []) => {
  const exclude = new Set(
    (Array.isArray(excludeCities) ? excludeCities : [])
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const shuffled = shuffleList(items).filter(
    (item) => !exclude.has(String(item.city || "").toLowerCase())
  );
  const selected = shuffled.slice(0, count);
  if (selected.length === count) return selected;
  const backup = shuffleList(items).slice(0, count);
  return backup;
};

const fetchWikipediaImageForQuery = async (query) => {
  const q = String(query || "").trim();
  if (!q) return "";

  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      q
    )}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = searchData?.query?.pages || {};
      const first = Object.values(pages)[0];
      const thumb = first?.thumbnail?.source;
      if (thumb) return thumb;
    }
  } catch {
    // continue fallback
  }

  try {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      q
    )}`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) return "";
    const summaryData = await summaryRes.json();
    return (
      summaryData?.thumbnail?.source ||
      summaryData?.originalimage?.source ||
      ""
    );
  } catch {
    return "";
  }
};

const enrichSuggestionImages = async (suggestions) => {
  const withImages = await Promise.all(
    suggestions.map(async (item) => {
      const query = `${item.city} ${item.state}`.trim();
      const image =
        (await fetchWikipediaImageForQuery(query)) ||
        (await fetchWikipediaImageForQuery(item.city)) ||
        "";
      return { ...item, image };
    })
  );
  return withImages;
};

const parseFirstJsonObject = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // try extracting JSON block if model surrounds it with text/markdown
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

app.get("/api/weather", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    if (!city) return res.status(400).json({ error: "city is required" });
    const cacheKey = city.toLowerCase();
    const cached = getWeatherCache(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=900");
      return res.json(cached);
    }
    const loc = await geocodeCity(city);
    if (!loc) {
      const payload = buildWeatherFallback(city, "Location unavailable");
      setWeatherCache(cacheKey, payload, 5 * 60 * 1000);
      return res.json(payload);
    }

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) {
      const payload = buildWeatherFallback(city, "Provider unavailable");
      setWeatherCache(cacheKey, payload, 5 * 60 * 1000);
      return res.json(payload);
    }
    const forecastData = await forecastRes.json();
    const currentTemp = forecastData?.current?.temperature_2m;
    const todayHigh = forecastData?.daily?.temperature_2m_max?.[0];
    const todayLow = forecastData?.daily?.temperature_2m_min?.[0];
    const currentCode = forecastData?.current?.weather_code;
    const todayCode = forecastData?.daily?.weather_code?.[0];

    const payload = {
      forecast: {
        city,
        summary: mapWeatherCode(currentCode ?? todayCode),
        currentTemp:
          typeof currentTemp === "number" ? Math.round(currentTemp) : "N/A",
        todayHigh:
          typeof todayHigh === "number" ? Math.round(todayHigh) : "N/A",
        todayLow:
          typeof todayLow === "number" ? Math.round(todayLow) : "N/A",
        currentCondition: mapWeatherCode(currentCode ?? todayCode),
      },
    };
    setWeatherCache(cacheKey, payload);
    res.set("Cache-Control", "public, max-age=900");
    res.json(payload);
  } catch (error) {
    console.error("Weather error:", error);
    const city = String(req.query.city || "").trim();
    const payload = buildWeatherFallback(city || "Unknown city", "Weather unavailable");
    if (city) {
      setWeatherCache(city.toLowerCase(), payload, 5 * 60 * 1000);
    }
    res.json(payload);
  }
});

app.get("/api/photos/pexels", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    const query = String(req.query.query || "").trim();
    const searchBase = city || query;
    if (!searchBase) return res.status(400).json({ error: "query is required" });

    const cacheKey = searchBase.toLowerCase();
    const cached = getPexelsCache(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=1800");
      return res.json(cached);
    }

    if (!PEXELS_KEY) {
      return res.status(200).json({ image: "" });
    }

    const parts = searchBase.split(/\s+/).filter(Boolean);
    const shortQuery = parts.slice(0, 2).join(" ");
    const candidates = city
      ? [
          `${city} city skyline india`,
          `${city} landmark india`,
          `${city} tourism`,
          `${city} street view`,
          `${city} india`,
        ]
      : [query, `${query} city`, `${query} tourism`, shortQuery];
    const cityLc = city.toLowerCase();

    const scorePhoto = (photo) => {
      const alt = String(photo?.alt || "").toLowerCase();
      let score = 0;
      if (cityLc && alt.includes(cityLc)) score += 10;
      if (/(city|street|landmark|fort|temple|river|palace|market)/.test(alt)) score += 3;
      if (cityLc && !cityLc.includes("jaipur") && /camel/.test(alt)) score -= 6;
      if (photo?.width && photo?.height && photo.width >= photo.height) score += 2;
      return score;
    };

    let bestPhoto = null;
    let bestScore = -Infinity;
    for (const candidate of candidates
      .map((q) => q.trim())
      .filter(Boolean)) {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        candidate
      )}&per_page=15&orientation=landscape`;
      const response = await fetch(url, {
        headers: {
          Authorization: PEXELS_KEY,
        },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const photos = Array.isArray(data?.photos) ? data.photos : [];
      for (const photo of photos) {
        if (!photo?.src?.large && !photo?.src?.landscape && !photo?.src?.original) continue;
        const score = scorePhoto(photo);
        if (score > bestScore) {
          bestScore = score;
          bestPhoto = photo;
        }
      }
      if (bestPhoto && bestScore >= 10) break;
    }

    const payload = {
      image:
        bestPhoto?.src?.large2x ||
        bestPhoto?.src?.large ||
        bestPhoto?.src?.landscape ||
        bestPhoto?.src?.medium ||
        bestPhoto?.src?.original ||
        "",
      photographer: bestPhoto?.photographer || "",
      url: bestPhoto?.url || "",
      alt: bestPhoto?.alt || "",
      source: "pexels",
    };

    setPexelsCache(cacheKey, payload);
    res.set("Cache-Control", "public, max-age=1800");
    res.json(payload);
  } catch (error) {
    console.error("Pexels error:", error);
    res.status(500).json({ error: "Failed to load photo" });
  }
});

app.post("/api/destinations/suggest", async (req, res) => {
  try {
    const from = String(req.body?.from || "").trim();
    const to = String(req.body?.to || "").trim();
    const history = Array.isArray(req.body?.history)
      ? req.body.history.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 5)
      : [];
    const previousCities = Array.isArray(req.body?.previousCities)
      ? req.body.previousCities.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 8)
      : [];

    let suggestions = pickUniqueSuggestions(defaultDestinationSuggestions(), 4, previousCities);

    if (OPENAI_KEY) {
      const randomNonce = Math.random().toString(36).slice(2, 10);
      const avoidLine = previousCities.length
        ? `Avoid these cities in this response: ${previousCities.join(", ")}.`
        : "";
      const prompt = [
        "Suggest exactly 4 destination cards in India.",
        "Use these themes exactly once each:",
        "1) Traditional",
        "2) Religious Place",
        "3) Indian Tourist",
        "4) Famous City",
        `Traveler context: from=${from || "unknown"}, to=${to || "unknown"}, recentTrips=${history.join(", ") || "none"}.`,
        `Variation seed: ${randomNonce}`,
        avoidLine,
        "Return ONLY valid JSON with shape:",
        '{"suggestions":[{"city":"...","state":"...","tagline":"...","mode":"Train|Bus|Cab","badges":["...","..."],"wikipediaQuery":"..."}]}',
        "Keep tagline under 12 words. Keep wikipediaQuery as a city/place title.",
      ].join("\n");

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are a travel assistant. Return JSON only. No markdown, no explanation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 1.05,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = String(data?.choices?.[0]?.message?.content || "").trim();
          const parsed = parseFirstJsonObject(content);
          const aiList = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
          const normalized = aiList.map(normalizeSuggestionItem).filter(Boolean).slice(0, 4);
          if (normalized.length === 4) {
            suggestions = normalized;
          }
        }
      } catch (error) {
        console.warn("AI destination suggestions unavailable:", error?.message || error);
      }
    }

    const suggestionsWithImages = await enrichSuggestionImages(suggestions);
    const payload = { suggestions: suggestionsWithImages };
    res.set("Cache-Control", "no-store");
    res.json(payload);
  } catch (error) {
    console.error("AI destination suggestion error:", error);
    const fallback = await enrichSuggestionImages(shuffleList(defaultDestinationSuggestions()));
    res.set("Cache-Control", "no-store");
    res.json({ suggestions: fallback });
  }
});

app.post("/api/newsletter", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const source = String(req.body.source || "web").trim();
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }

    if (USE_MONGO) {
      const existing = await Newsletter.findOne({ email }).lean();
      if (existing) {
        return res.status(200).json({ message: "You are already subscribed." });
      }
      await Newsletter.create({ email, source });
      return res.status(201).json({ message: "Subscribed successfully." });
    }

    if (newsletterSubscribers.has(email)) {
      return res.status(200).json({ message: "You are already subscribed." });
    }
    newsletterSubscribers.add(email);
    return res.status(201).json({ message: "Subscribed successfully." });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return res.status(500).json({ error: "Unable to subscribe right now." });
  }
});

app.post("/api/analytics", (req, res) => {
  try {
    const event = String(req.body?.event || "").trim();
    const page = String(req.body?.page || "web").trim();
    const metadata =
      req.body?.metadata && typeof req.body.metadata === "object"
        ? req.body.metadata
        : {};

    if (!event || event.length > 80) {
      return res.status(400).json({ error: "event is required" });
    }
    if (!allowedAnalyticsEvents.has(event)) {
      return res.status(400).json({ error: "unsupported event" });
    }

    analyticsEvents.push({
      event,
      page: page.slice(0, 60),
      metadata,
      ip: req.ip || "",
      at: new Date().toISOString(),
    });
    if (analyticsEvents.length > 500) analyticsEvents.shift();
    return res.status(202).json({ ok: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({ error: "Unable to capture analytics event" });
  }
});

app.get("/api/analytics/summary", (req, res) => {
  const counts = analyticsEvents.reduce((acc, item) => {
    acc[item.event] = (acc[item.event] || 0) + 1;
    return acc;
  }, {});
  res.json({ total: analyticsEvents.length, counts });
});

/* ---------------- STATIC ---------------- */
const publicDir = path.join(__dirname, "public");
const uploadsDir = path.join(publicDir, "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(
  express.static(publicDir, {
    index: "index.html",
    extensions: ["html"],
  })
);

/* ---------------- API ROUTES ---------------- */
app.use("/api/routes", routeApi);
app.use("/api/auth", authApi);
app.use("/api/explore", exploreRoutes);
app.use("/api/trains", trainApi);
app.use("/api/buses", busApi);
app.use("/api/cabs", cabApi);

/* ---------------- STATIC PAGES ---------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/explore", (req, res) => {
  res.sendFile(path.join(publicDir, "route.html"));
});

/* ---------------- HEALTH ---------------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ---------------- 404 ---------------- */
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, "404.html"));
});

/* ---------------- DATABASE ---------------- */
if (USE_MONGO) {
  const mongoUri = process.env.MONGO_URI;
  const maxRetries = 5;
  const retryDelayMs = 2500;

  const connectMongoWithRetry = async (attempt = 1) => {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected");
    } catch (err) {
      const code = err?.code || "UNKNOWN";
      const isSrvDnsError = code === "ECONNREFUSED" && err?.syscall === "querySrv";
      if (isSrvDnsError) {
        console.warn(
          `MongoDB SRV lookup failed (attempt ${attempt}/${maxRetries}). Retrying in ${retryDelayMs}ms...`
        );
      } else {
        console.error("MongoDB connection error:", err?.message || err);
      }

      if (attempt < maxRetries) {
        setTimeout(() => connectMongoWithRetry(attempt + 1), retryDelayMs);
      } else {
        console.error("MongoDB connection failed after retries. Check internet/DNS and MONGO_URI.");
      }
    }
  };

  connectMongoWithRetry();
} else {
  console.log("MongoDB disabled (USE_MONGO=false).");
}

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
