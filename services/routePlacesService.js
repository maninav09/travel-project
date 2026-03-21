// Purpose: shared helpers that enrich route results with details, images, and AI fallbacks.
const Route = require("../models/route");

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MODE_MAP = {
  Train: "train",
  Bus: "bus",
  Cab: "cab",
  train: "train",
  bus: "bus",
  cab: "cab",
};

const IMAGE_MAP = {
  jaipur: "img/jaipur.jpg",
  goa: "img/goa.jpg",
  varanasi: "img/varnashi.jpg",
  varnashi: "img/varnashi.jpg",
  benaras: "img/varnashi.jpg",
  leh: "img/leh.jpg",
  ladakh: "img/leh.jpg",
  kochi: "img/lochi.jpg",
  cochin: "img/lochi.jpg",
  rishikesh: "img/rishi.jpg",
};

const pickImageForCity = (city) => {
  const key = (city || "").toLowerCase().trim();
  return IMAGE_MAP[key] || "img/travel1.jpg";
};

const normalizeMode = (value) => MODE_MAP[value] || "train";

const titleCase = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fetchDistance = async (from, to, mode) => {
  if (!GOOGLE_KEY) return "";
  try {
    const params = new URLSearchParams({
      origins: from,
      destinations: to,
      key: GOOGLE_KEY,
      mode: mode === "cab" ? "driving" : "transit",
    });

    if (mode === "train" || mode === "bus") {
      params.set("transit_mode", mode);
      params.set("departure_time", "now");
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();
    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") return "";
    return element.duration?.text || "";
  } catch {
    return "";
  }
};

const geocodePlace = async (place) => {
  if (!GOOGLE_KEY || !place) return null;
  try {
    const params = new URLSearchParams({ address: place, key: GOOGLE_KEY });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const location = data?.results?.[0]?.geometry?.location;
    if (!location) return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
};

const nearbySearch = async (lat, lng, type) => {
  if (!GOOGLE_KEY) return [];
  try {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: "7000",
      type,
      key: GOOGLE_KEY,
    });
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    return [];
  }
};

const photoUrl = (photoRef) =>
  photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=900&photo_reference=${photoRef}&key=${GOOGLE_KEY}`
    : "";

const mapPlaceToDetail = (place, fallbackImage) => {
  const ref = place?.photos?.[0]?.photo_reference;
  const image = photoUrl(ref) || fallbackImage;
  return {
    name: place?.name || "Local Favorite",
    highlight: place?.types?.includes("tourist_attraction")
      ? "A must-visit highlight on your route."
      : "Popular stop with great reviews.",
    stop: place?.vicinity || place?.formatted_address || "City Center",
    timing: "Check timings locally",
    rating: place?.rating ? `${place.rating} ★` : "4.4 ★",
    price: place?.price_level ? `Price level ${place.price_level}` : "₹500+",
    image,
  };
};

const callOpenAI = async (prompt) => {
  if (!OPENAI_KEY) return null;
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
              "You are a travel assistant. Return ONLY valid JSON with no extra text.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const buildFallback = (toCity, fromCity) => {
  const item = (name, stop, highlight) => ({
    name,
    highlight,
    stop,
    timing: "Check timings locally",
    rating: "4.4 *",
    price: "INR 500+",
  });

  return {
    summary: `A smooth route from ${fromCity} to ${toCity} with curated stops and local favorites.`,
    hotels: [
      item("Central Stay", `${toCity} Center`, "Comfortable stay with easy access."),
      item("Heritage Inn", `${toCity} Old Town`, "Cozy rooms with local charm."),
      item("City View Hotel", `${toCity} Main Road`, "Great views and friendly service."),
    ],
    restaurants: [
      item("Spice Hub", `${toCity} Market`, "Popular spot for regional flavors."),
      item("Riverside Cafe", `${toCity} Riverside`, "Relaxed setting with great food."),
      item("Street Kitchen", `${toCity} Central Plaza`, "Quick bites and local favorites."),
    ],
    places: [
      item("City Landmark", `${toCity} Center`, "A must-visit highlight."),
      item("Local Museum", `${toCity} Cultural District`, "Stories and heritage in one stop."),
      item("Scenic Park", `${toCity} Green Belt`, "Perfect for a relaxed walk."),
    ],
  };
};

const generateRouteDetails = async ({ from, to, durations }) => {
  const prompt = `
Create travel details for a route in India.
From: ${from}
To: ${to}
Durations (if available): Train ${durations.train || "N/A"}, Bus ${durations.bus || "N/A"}, Cab ${durations.cab || "N/A"}

Return JSON with:
summary (string),
hotels (3 items),
restaurants (3 items),
places (3 items).

Each item must include: name, highlight, stop, timing, rating, price.
Keep highlight as a short "best line".
`;

  const ai = await callOpenAI(prompt);
  if (!ai) return buildFallback(to, from);

  const normalizeList = (items) =>
    Array.isArray(items) ? items.slice(0, 3) : [];

  return {
    summary: ai.summary || buildFallback(to, from).summary,
    hotels: normalizeList(ai.hotels),
    restaurants: normalizeList(ai.restaurants),
    places: normalizeList(ai.places),
  };
};

const fetchPlacesForCity = async (to) => {
  const coords = await geocodePlace(to);
  if (!coords) return null;
  const fallback = pickImageForCity(to);
  const [hotelsRaw, restaurantsRaw, placesRaw] = await Promise.all([
    nearbySearch(coords.lat, coords.lng, "lodging"),
    nearbySearch(coords.lat, coords.lng, "restaurant"),
    nearbySearch(coords.lat, coords.lng, "tourist_attraction"),
  ]);

  return {
    hotels: hotelsRaw.slice(0, 3).map((p) => mapPlaceToDetail(p, fallback)),
    restaurants: restaurantsRaw.slice(0, 3).map((p) => mapPlaceToDetail(p, fallback)),
    places: placesRaw.slice(0, 3).map((p) => mapPlaceToDetail(p, fallback)),
  };
};

const uniqueByName = (items) => {
  const seen = new Set();
  const results = [];
  for (const item of items) {
    const key = (item?.name || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
};

const isIncomplete = (route) => {
  if (!route) return true;
  const hasDurations = route.durationByMode
    ? Boolean(route.durationByMode.train || route.durationByMode.bus || route.durationByMode.cab)
    : false;
  return (
    !route.summary ||
    !hasDurations ||
    !Array.isArray(route.hotels) ||
    route.hotels.length < 1 ||
    !Array.isArray(route.restaurants) ||
    route.restaurants.length < 1 ||
    !Array.isArray(route.places) ||
    route.places.length < 1
  );
};

const ensureRoutes = async ({ from, to, force = false }) => {
  const durations = {
    train: await fetchDistance(from, to, "train"),
    bus: await fetchDistance(from, to, "bus"),
    cab: await fetchDistance(from, to, "cab"),
  };

  const details = await generateRouteDetails({ from, to, durations });
  const normalizeItems = (items) =>
    (items || []).slice(0, 3).map((item) => ({
      name: item.name || item.title || "Local Favorite",
      highlight: item.highlight || item.line || "Top-rated stop on this route.",
      stop: item.stop || `${to} Center`,
      timing: item.timing || "Flexible hours",
      rating: item.rating || "4.4 ★",
      price: item.price || "₹500+",
    }));

  const googlePlaces = await fetchPlacesForCity(to);
  const hotels = googlePlaces?.hotels?.length
    ? googlePlaces.hotels
    : normalizeItems(details.hotels).map((item) => ({
        ...item,
        image: pickImageForCity(to),
      }));
  const restaurants = googlePlaces?.restaurants?.length
    ? googlePlaces.restaurants
    : normalizeItems(details.restaurants).map((item) => ({
        ...item,
        image: pickImageForCity(to),
      }));
  const places = googlePlaces?.places?.length
    ? googlePlaces.places
    : normalizeItems(details.places).map((item) => ({
        ...item,
        image: pickImageForCity(to),
      }));

  const payload = {
    from,
    to,
    summary: details.summary,
    durationByMode: durations,
    hotels,
    restaurants,
    places,
    foodCorners: restaurants,
    userEmail: "",
  };

  const existing = await Route.find({
    from: new RegExp(escapeRegex(from), "i"),
    to: new RegExp(escapeRegex(to), "i"),
  });
  const existingModes = new Set(existing.map((r) => normalizeMode(r.mode)));

  const modes = ["train", "bus", "cab"];
  const shouldUpsertAll = force || existing.some(isIncomplete);

  if (shouldUpsertAll) {
    await Promise.all(
      modes.map((m) =>
        Route.findOneAndUpdate(
          { from, to, mode: titleCase(m) },
          { $set: { mode: titleCase(m), duration: durations[m] || "", ...payload } },
          { upsert: true }
        )
      )
    );
  } else {
    const inserts = modes
      .filter((m) => !existingModes.has(m))
      .map((m) => ({
        mode: titleCase(m),
        duration: durations[m] || "",
        ...payload,
      }));

    if (inserts.length) {
      await Route.insertMany(inserts);
    }
  }

  return Route.find({
    from: new RegExp(escapeRegex(from), "i"),
    to: new RegExp(escapeRegex(to), "i"),
  })
    .sort({ createdAt: -1 })
    .limit(10);
};

module.exports = {
  ensureRoutes,
  fetchPlacesForCity,
  isIncomplete,
  normalizeMode,
};
