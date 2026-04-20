// Purpose: bootstraps the Express app, mounts routes, and serves the frontend.
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const {
  disableMongo,
  isMongoRequested,
} = require("./services/mongoRuntime");

/* ROUTES */
const routeApi = require("./routes/routeAPI");
const authApi = require("./routes/authAPI");
const exploreRoutes = require("./routes/exploreRoute");
const trainApi = require("./routes/trainAPI");
const busApi = require("./routes/busAPI");
const cabApi = require("./routes/cabAPI");
const enhancementsApi = require("./routes/enhancementsAPI");

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
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});
app.use(express.json({ limit: "250kb" }));
app.use(express.urlencoded({ extended: true, limit: "250kb" }));
app.use((req, res, next) => {
  if (req.path.includes(".env")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

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

const integrationHealth = {
  openai: {
    enabled: Boolean(OPENAI_KEY),
    warned: false,
    lastError: "",
  },
  emailjs: {
    enabled: true,
    warned: false,
    lastError: "",
  },
};

const disableIntegration = (name, message) => {
  const target = integrationHealth[name];
  if (!target) return;
  target.enabled = false;
  target.lastError = String(message || "").trim();
  if (target.warned) return;
  target.warned = true;
  console.warn(`${name.toUpperCase()} disabled: ${target.lastError}`);
};

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
const EMAILJS_SERVICE_ID = (process.env.EMAILJS_SERVICE_ID || "").trim();
const EMAILJS_TEMPLATE_ID = (process.env.EMAILJS_TEMPLATE_ID || "").trim();
const EMAILJS_PUBLIC_KEY = (process.env.EMAILJS_PUBLIC_KEY || "").trim();
const EMAILJS_PRIVATE_KEY = (
  process.env.EMAILJS_PRIVATE_KEY ||
  process.env.EMAILJS_ACCESS_TOKEN ||
  ""
).trim();
const EMAILJS_ENDPOINT = (
  process.env.EMAILJS_ENDPOINT ||
  "https://api.emailjs.com/api/v1.0/email/send"
).trim();
const EMAILJS_NEWSLETTER_FROM_NAME = (
  process.env.EMAILJS_NEWSLETTER_FROM_NAME || "Travel-route Connection"
).trim();
const EMAILJS_NEWSLETTER_SUBJECT = (process.env.EMAILJS_NEWSLETTER_SUBJECT || "").trim();
const EMAILJS_NEWSLETTER_MESSAGE = (process.env.EMAILJS_NEWSLETTER_MESSAGE || "").trim();

const maskConfigValue = (value, { head = 4, tail = 2 } = {}) => {
  const text = String(value || "").trim();
  if (!text) return "(missing)";
  if (text.length <= head + tail) return `${text.slice(0, 1)}***`;
  return `${text.slice(0, head)}***${text.slice(-tail)}`;
};

const logEmailJsConfigStatus = () => {
  const serviceOk = /^service_/i.test(EMAILJS_SERVICE_ID);
  const templateOk = /^template_/i.test(EMAILJS_TEMPLATE_ID);
  const publicOk = EMAILJS_PUBLIC_KEY.length >= 8;
  const privateOk = EMAILJS_PRIVATE_KEY.length >= 8;

  console.log(
    `[EmailJS] service_id=${maskConfigValue(EMAILJS_SERVICE_ID)} (${serviceOk ? "ok" : "check"})`
  );
  console.log(
    `[EmailJS] template_id=${maskConfigValue(EMAILJS_TEMPLATE_ID)} (${templateOk ? "ok" : "check"})`
  );
  console.log(
    `[EmailJS] public_key=${maskConfigValue(EMAILJS_PUBLIC_KEY)} (${publicOk ? "ok" : "check"})`
  );
  console.log(
    `[EmailJS] private_key=${maskConfigValue(EMAILJS_PRIVATE_KEY)} (${privateOk ? "ok" : "check"})`
  );
  console.log(`[EmailJS] endpoint=${EMAILJS_ENDPOINT || "(missing)"}`);
};

logEmailJsConfigStatus();

const getSubscriberDisplayName = (email) => {
  const local = String(email || "").split("@")[0] || "Traveler";
  const clean = local.replace(/[._-]+/g, " ").trim();
  if (!clean) return "Traveler";
  return clean
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const sendNewsletterEmail = async ({ email, source }) => {
  if (!integrationHealth.emailjs.enabled) {
    return {
      sent: false,
      reason: "emailjs_temporarily_disabled",
      detail: integrationHealth.emailjs.lastError,
    };
  }
  if (
    !EMAILJS_SERVICE_ID ||
    !EMAILJS_TEMPLATE_ID ||
    !EMAILJS_PUBLIC_KEY ||
    !EMAILJS_PRIVATE_KEY
  ) {
    return { sent: false, reason: "emailjs_not_configured" };
  }

  const recipientName = getSubscriberDisplayName(email);
  const siteName = EMAILJS_NEWSLETTER_FROM_NAME || "Travel-route Connection";
  const welcomeSubject =
    EMAILJS_NEWSLETTER_SUBJECT || `Welcome to ${siteName}, ${recipientName}!`;
  const welcomeMessage =
    EMAILJS_NEWSLETTER_MESSAGE ||
    (`Hi ${recipientName}, welcome to ${siteName}. ` +
      "Plan your trip with us and discover smoother routes, practical travel tips, and better travel choices. " +
      "Stay connected for exclusive offers, special discounts, and coupon updates delivered to your email.");
  const templateParams = {
    email,
    to: email,
    to_email: email,
    recipient: email,
    recipient_email: email,
    user_email: email,
    email_address: email,
    userEmail: email,
    from_email: "no-reply@route-connect.com",
    reply_to: "no-reply@route-connect.com",
    to_name: recipientName,
    from_name: siteName,
    name: recipientName,
    user_name: recipientName,
    subscriber_name: recipientName,
    recipient_name: recipientName,
    full_name: recipientName,
    userName: recipientName,
    subscriber_email: email,
    source,
    app_name: siteName,
    site_name: siteName,
    subject: welcomeSubject,
    title: welcomeSubject,
    newsletter_subject: welcomeSubject,
    message: welcomeMessage,
    text: welcomeMessage,
    body: welcomeMessage,
    content: welcomeMessage,
    newsletter_message: welcomeMessage,
  };

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: templateParams,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (
      response.status === 400 &&
      /template id not found/i.test(String(detail || ""))
    ) {
      return {
        sent: false,
        reason: "emailjs_template_not_found",
        detail: String(detail || "").trim(),
      };
    }
    if (
      response.status === 403 &&
      /non-browser applications/i.test(String(detail || ""))
    ) {
      return {
        sent: false,
        reason: "emailjs_non_browser_blocked",
        detail: String(detail || "").trim(),
      };
    }
    if (
      /invalid grant/i.test(String(detail || "")) ||
      /reconnect your gmail account/i.test(String(detail || ""))
    ) {
      const reconnectMessage =
        String(detail || "").trim() ||
        "Gmail provider authorization is invalid. Reconnect your Gmail account in EmailJS.";
      disableIntegration(
        "emailjs",
        reconnectMessage
      );
      return {
        sent: false,
        reason: "emailjs_provider_reconnect_required",
        detail: reconnectMessage,
      };
    }
    throw new Error(
      `EmailJS send failed (${response.status})${detail ? `: ${detail}` : ""}`
    );
  }
  return { sent: true };
};

app.post("/api/newsletter/debug", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const source = String(req.body?.source || "debug").trim();
    const runSendTest = Boolean(req.body?.runSendTest);

    const config = {
      serviceIdMasked: maskConfigValue(EMAILJS_SERVICE_ID),
      templateIdMasked: maskConfigValue(EMAILJS_TEMPLATE_ID),
      publicKeyMasked: maskConfigValue(EMAILJS_PUBLIC_KEY),
      privateKeyMasked: maskConfigValue(EMAILJS_PRIVATE_KEY),
      endpoint: EMAILJS_ENDPOINT || "(missing)",
      checks: {
        serviceIdFormatOk: /^service_/i.test(EMAILJS_SERVICE_ID),
        templateIdFormatOk: /^template_/i.test(EMAILJS_TEMPLATE_ID),
        publicKeyPresent: EMAILJS_PUBLIC_KEY.length >= 8,
        privateKeyPresent: EMAILJS_PRIVATE_KEY.length >= 8,
      },
    };

    if (!runSendTest) {
      return res.json({
        ok: true,
        mode: "config_only",
        config,
        hint:
          "Set runSendTest=true with a valid email in request body to test live EmailJS delivery.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        error: "Valid email is required when runSendTest=true.",
        config,
      });
    }

    try {
      const result = await sendNewsletterEmail({ email, source });
      return res.json({
        ok: true,
        mode: "send_test",
        config,
        test: {
          email,
          source,
          sent: Boolean(result?.sent),
          reason: result?.reason || "sent",
          detail: String(result?.detail || "").trim() || undefined,
        },
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        mode: "send_test",
        config,
        test: {
          email,
          source,
          sent: false,
          reason: "request_failed",
          detail: error?.message || "Unknown EmailJS error",
        },
      });
    }
  } catch (error) {
    console.error("Newsletter debug error:", error);
    return res.status(500).json({ ok: false, error: "Newsletter debug failed" });
  }
});

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
    pexelsQuery: "Jaipur forts india",
    touristPlaces: ["Amber Fort", "City Palace", "Hawa Mahal"],
  },
  {
    city: "Varanasi",
    state: "Uttar Pradesh",
    tagline: "Religious ghats, temple rituals, and spiritual walks.",
    mode: "Train",
    badges: ["Religious Place", "Spiritual"],
    wikipediaQuery: "Varanasi",
    pexelsQuery: "Varanasi ghats india",
    touristPlaces: ["Dashashwamedh Ghat", "Kashi Vishwanath Temple", "Assi Ghat"],
  },
  {
    city: "Agra",
    state: "Uttar Pradesh",
    tagline: "Classic Indian tourist landmarks and old-city charm.",
    mode: "Cab",
    badges: ["Indian Tourist", "Monument"],
    wikipediaQuery: "Agra",
    pexelsQuery: "Agra Taj Mahal india",
    touristPlaces: ["Taj Mahal", "Agra Fort", "Mehtab Bagh"],
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    tagline: "Famous city skyline, sea views, and vibrant streets.",
    mode: "Bus",
    badges: ["Famous City", "Urban"],
    wikipediaQuery: "Mumbai",
    pexelsQuery: "Mumbai skyline india",
    touristPlaces: ["Gateway of India", "Marine Drive", "Colaba Causeway"],
  },
  {
    city: "Udaipur",
    state: "Rajasthan",
    tagline: "Lakeside palaces and old city lanes.",
    mode: "Train",
    badges: ["Heritage", "Romantic"],
    wikipediaQuery: "Udaipur",
    pexelsQuery: "Udaipur lake palace india",
    touristPlaces: ["City Palace", "Lake Pichola", "Sajjangarh Fort"],
  },
  {
    city: "Mysuru",
    state: "Karnataka",
    tagline: "Royal architecture and calm cultural streets.",
    mode: "Bus",
    badges: ["Culture", "Palace"],
    wikipediaQuery: "Mysore",
    pexelsQuery: "Mysore Palace india",
    touristPlaces: ["Mysore Palace", "Chamundi Hills", "Brindavan Gardens"],
  },
  {
    city: "Amritsar",
    state: "Punjab",
    tagline: "Sacred landmarks and vibrant Punjabi food.",
    mode: "Train",
    badges: ["Religious Place", "Food"],
    wikipediaQuery: "Amritsar",
    pexelsQuery: "Amritsar golden temple india",
    touristPlaces: ["Golden Temple", "Jallianwala Bagh", "Wagah Border"],
  },
  {
    city: "Kochi",
    state: "Kerala",
    tagline: "Coastal culture, cafes, and harbor views.",
    mode: "Cab",
    badges: ["Famous City", "Coastal"],
    wikipediaQuery: "Kochi",
    pexelsQuery: "Kochi Kerala waterfront",
    touristPlaces: ["Fort Kochi", "Chinese Fishing Nets", "Mattancherry Palace"],
  },
  {
    city: "Rishikesh",
    state: "Uttarakhand",
    tagline: "Riverfront walks and spiritual retreat vibes.",
    mode: "Bus",
    badges: ["Religious Place", "Nature"],
    wikipediaQuery: "Rishikesh",
    pexelsQuery: "Rishikesh Ganga river india",
    touristPlaces: ["Laxman Jhula", "Triveni Ghat", "Parmarth Niketan"],
  },
  {
    city: "Goa",
    state: "Goa",
    tagline: "Beaches, nightlife, and Portuguese heritage.",
    mode: "Cab",
    badges: ["Indian Tourist", "Coastal"],
    wikipediaQuery: "Goa",
    pexelsQuery: "Goa beach india",
    touristPlaces: ["Baga Beach", "Fontainhas", "Basilica of Bom Jesus"],
  },
  {
    city: "Shimla",
    state: "Himachal Pradesh",
    tagline: "Hill views, colonial streets, and cool weather.",
    mode: "Bus",
    badges: ["Famous City", "Hill Station"],
    wikipediaQuery: "Shimla",
    pexelsQuery: "Shimla hills india",
    touristPlaces: ["Mall Road", "Jakhoo Temple", "The Ridge"],
  },
  {
    city: "Jodhpur",
    state: "Rajasthan",
    tagline: "Blue city charm and massive hill forts.",
    mode: "Train",
    badges: ["Traditional", "Heritage"],
    wikipediaQuery: "Jodhpur",
    pexelsQuery: "Jodhpur blue city india",
    touristPlaces: ["Mehrangarh Fort", "Clock Tower Market", "Jaswant Thada"],
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
  const touristPlaces = Array.isArray(item?.touristPlaces)
    ? item.touristPlaces.map((place) => String(place || "").trim()).filter(Boolean).slice(0, 3)
    : [];
  return {
    city,
    state: state || "India",
    tagline,
    mode,
    badges: badges.length ? badges : ["Popular", "Travel"],
    wikipediaQuery: String(item?.wikipediaQuery || city).trim(),
    pexelsQuery: String(item?.pexelsQuery || `${city} ${state} tourism`).trim(),
    touristPlaces: touristPlaces.length
      ? touristPlaces
      : [`${city} Old Town`, `${city} Main Landmark`, `${city} Local Market`],
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

const fetchPexelsPhoto = async ({ city = "", query = "" } = {}) => {
  const searchBase = String(city || query || "").trim();
  if (!searchBase || !PEXELS_KEY) return "";

  const cacheKey = searchBase.toLowerCase();
  const cached = getPexelsCache(cacheKey);
  if (cached?.image) return cached.image;

  const parts = searchBase.split(/\s+/).filter(Boolean);
  const shortQuery = parts.slice(0, 2).join(" ");
  const cityLc = String(city || "").toLowerCase();
  const candidates = city
    ? [
        query,
        `${city} landmark india`,
        `${city} tourism india`,
        `${city} skyline india`,
        `${city} india`,
      ]
    : [query, `${query} tourism`, `${query} india`, shortQuery];

  const scorePhoto = (photo) => {
    const alt = String(photo?.alt || "").toLowerCase();
    let score = 0;
    if (cityLc && alt.includes(cityLc)) score += 10;
    if (/(city|street|landmark|fort|temple|river|palace|market|beach|ghat|hill)/.test(alt)) {
      score += 3;
    }
    if (photo?.width && photo?.height && photo.width >= photo.height) score += 2;
    return score;
  };

  let bestPhoto = null;
  let bestScore = -Infinity;
  for (const candidate of candidates.map((value) => String(value || "").trim()).filter(Boolean)) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      candidate
    )}&per_page=12&orientation=landscape`;
    const response = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
    if (!response.ok) continue;
    const data = await response.json();
    const photos = Array.isArray(data?.photos) ? data.photos : [];
    for (const photo of photos) {
      if (!photo?.src) continue;
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
  return payload.image || "";
};

const enrichSuggestionImages = async (suggestions) => {
  const withImages = await Promise.all(
    suggestions.map(async (item) => {
      const query = `${item.city} ${item.state}`.trim();
      const image =
        (await fetchPexelsPhoto({
          city: item.city,
          query: item.pexelsQuery || item.wikipediaQuery || query,
        })) ||
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
      return res.status(200).json({ image: "", source: "pexels" });
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
    res.status(200).json({ image: "", source: "pexels" });
  }
});

app.post("/api/destinations/suggest", async (req, res) => {
  try {
    const from = String(req.body?.from || "").trim();
    const to = String(req.body?.to || "").trim();
    const requireAi = Boolean(req.body?.requireAi);
    const history = Array.isArray(req.body?.history)
      ? req.body.history.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 5)
      : [];
    const previousCities = Array.isArray(req.body?.previousCities)
      ? req.body.previousCities.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 24)
      : [];
    const excludedCities = new Set(previousCities.map((v) => v.toLowerCase()));

    let suggestions = requireAi ? [] : pickUniqueSuggestions(defaultDestinationSuggestions(), 4, previousCities);
    let aiSucceeded = false;

    if (OPENAI_KEY && integrationHealth.openai.enabled) {
      for (let attempt = 0; attempt < 3 && !aiSucceeded; attempt += 1) {
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
          "All 4 cities must be in India and must be different from each other.",
          `Traveler context: from=${from || "unknown"}, to=${to || "unknown"}, recentTrips=${history.join(", ") || "none"}.`,
          `Variation seed: ${randomNonce}`,
          avoidLine,
          "Return ONLY valid JSON with shape:",
          '{"suggestions":[{"city":"...","state":"...","tagline":"...","mode":"Train|Bus|Cab","badges":["...","..."],"touristPlaces":["...","...","..."],"wikipediaQuery":"...","pexelsQuery":"..."}]}',
          "Keep tagline under 12 words. Keep wikipediaQuery as a city/place title.",
          "touristPlaces must contain exactly 3 famous tourist places for each city.",
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

          if (!response.ok) {
            const detail = await response.text().catch(() => "");
            if (
              response.status === 401 &&
              /incorrect api key|invalid api key/i.test(String(detail || ""))
            ) {
              disableIntegration(
                "openai",
                "OpenAI API key is invalid. Update OPENAI_API_KEY in .env."
              );
              break;
            }
            continue;
          }
          const data = await response.json();
          const content = String(data?.choices?.[0]?.message?.content || "").trim();
          const parsed = parseFirstJsonObject(content);
          const aiList = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
          const normalized = aiList
            .map(normalizeSuggestionItem)
            .filter(Boolean)
            .filter((item) => !excludedCities.has(String(item.city || "").toLowerCase()))
            .slice(0, 4);
          if (normalized.length === 4) {
            suggestions = normalized;
            aiSucceeded = true;
          }
        } catch (error) {
          console.warn("AI destination suggestions unavailable:", error?.message || error);
        }
      }
    }

    if (!aiSucceeded) {
      suggestions = pickUniqueSuggestions(defaultDestinationSuggestions(), 4, previousCities);
    }

    const suggestionsWithImages = await enrichSuggestionImages(suggestions);
    const completeWithImages = suggestionsWithImages.filter(
      (item) => String(item?.image || "").trim().length > 0
    );
    const payload = {
      suggestions: suggestionsWithImages,
      aiUsed: aiSucceeded,
      warning:
        aiSucceeded && completeWithImages.length < 4
          ? "Some destination photos could not be loaded."
          : !aiSucceeded
            ? "Showing fresh rotating destination picks while AI suggestions are unavailable."
            : "",
    };
    res.set("Cache-Control", "no-store");
    res.json(payload);
  } catch (error) {
    console.error("AI destination suggestion error:", error);
    const fallback = await enrichSuggestionImages(shuffleList(defaultDestinationSuggestions()));
    res.set("Cache-Control", "no-store");
    res.json({
      suggestions: fallback,
      aiUsed: false,
      warning: "Showing rotating fallback destination picks right now.",
    });
  }
});

app.post("/api/newsletter", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const source = String(req.body.source || "web").trim();
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }

    const buildSubscribeResponse = (emailResult = {}) => {
      const emailStatus = String(emailResult?.status || "failed").trim();
      const detail = String(emailResult?.detail || "").trim();
      if (emailStatus === "sent") {
        return res.status(200).json({
          message: "Subscribed successfully. Welcome email sent.",
          emailStatus,
        });
      }

      const warning =
        emailStatus === "not_configured"
          ? "Request accepted, but welcome email was not sent because EmailJS is not configured."
          : emailStatus === "non_browser_blocked"
            ? "Request accepted, but EmailJS is blocking server-side API calls. Enable non-browser/API access."
            : emailStatus === "provider_reconnect_required"
              ? "Request accepted, but EmailJS could not send because the connected Gmail account needs to be reconnected in EmailJS."
            : emailStatus === "template_not_found"
              ? "Request accepted, but EmailJS template ID is invalid or missing. Update EMAILJS_TEMPLATE_ID."
              : "Request accepted, but welcome email was not sent.";
      return res.status(200).json({
        message: warning,
        warning,
        emailStatus,
        detail: detail || undefined,
      });
    };

    const sendWelcome = async () => {
      const result = { status: "sent", detail: "" };
      try {
        const mailResult = await sendNewsletterEmail({ email, source });
        if (mailResult?.reason === "emailjs_not_configured") {
          result.status = "not_configured";
        } else if (mailResult?.reason === "emailjs_non_browser_blocked") {
          result.status = "non_browser_blocked";
        } else if (mailResult?.reason === "emailjs_temporarily_disabled") {
          result.status = "provider_reconnect_required";
        } else if (mailResult?.reason === "emailjs_provider_reconnect_required") {
          result.status = "provider_reconnect_required";
        } else if (mailResult?.reason === "emailjs_template_not_found") {
          result.status = "template_not_found";
        }
        result.detail = String(mailResult?.detail || "").trim();
      } catch (mailError) {
        result.status = "failed";
        result.detail = String(mailError?.message || "").trim();
        console.warn("Newsletter email send warning:", mailError?.message || mailError);
      }
      return result;
    };

    // Privacy mode: do not persist newsletter emails in DB or memory.
    const emailResult = await sendWelcome();
    return buildSubscribeResponse(emailResult);
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
app.use("/api/enhancements", enhancementsApi);

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
if (isMongoRequested()) {
  const mongoUri = process.env.MONGO_URI;
  const maxRetries = 5;
  const retryDelayMs = 2500;

  const connectMongoWithRetry = async (attempt = 1) => {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected");
    } catch (err) {
      const code = err?.code || "UNKNOWN";
      const isSrvDnsError =
        err?.syscall === "querySrv" ||
        ["ECONNREFUSED", "ENOTFOUND", "ETIMEOUT", "ESERVFAIL"].includes(code);
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
        disableMongo(err?.message || "MongoDB unavailable");
        console.error(
          "MongoDB connection failed after retries. Falling back to in-memory mode."
        );
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
