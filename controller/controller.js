const axios = require("axios");

const GOOGLE_KEY = (process.env.GOOGLE_MAPS_API_KEY || "").trim();
const GEOAPIFY_MATRIX_KEY = (
  process.env.GEOAPIFY_MATRIX_API_KEY ||
  process.env.GEOAPIFYMATRIX_API_KEY ||
  process.env.GEOAPIFY_MATRIX_KEY ||
  process.env.GEOAPIFY_API_KEY ||
  process.env.GEOAPIFY_KEY ||
  ""
).trim();
const cacheStore = new Map();
const inFlightStore = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const getCache = (key) => {
  const cached = cacheStore.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return cached.value;
};

const setCache = (key, value, ttlMs = CACHE_TTL_MS) => {
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const getOrComputeCached = async (key, producer, ttlMs = CACHE_TTL_MS) => {
  const cached = getCache(key);
  if (cached) return cached;

  if (inFlightStore.has(key)) {
    return inFlightStore.get(key);
  }

  const promise = Promise.resolve()
    .then(() => producer())
    .then((value) => {
      setCache(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inFlightStore.delete(key);
    });

  inFlightStore.set(key, promise);
  return promise;
};

const geocodeCity = async (city, apiKey, state = "") => {
  const cleanCity = String(city || "").trim();
  const cleanState = String(state || "").trim();
  const queryText = [cleanCity, cleanState, "India"].filter(Boolean).join(", ");
  const response = await axios.get(
    "https://api.geoapify.com/v1/geocode/search",
    {
      params: {
        text: queryText || cleanCity,
        limit: 1,
        apiKey,
      },
    }
  );
  const feature = response?.data?.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  return { lon: coords[0], lat: coords[1] };
};

const fetchPlaces = async ({ lat, lon, categories, apiKey }) => {
  const response = await axios.get("https://api.geoapify.com/v2/places", {
    params: {
      categories,
      filter: `circle:${lon},${lat},15000`,
      bias: `proximity:${lon},${lat}`,
      limit: 20,
      apiKey,
    },
  });
  return Array.isArray(response?.data?.features) ? response.data.features : [];
};

const mapGeoapifyPlace = (feature) => {
  const props = feature?.properties || {};
  const coords = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [];
  return {
    name: props.name || props.address_line1 || "Unknown",
    rating: props.rating || null,
    address:
      props.formatted ||
      [props.address_line1, props.address_line2].filter(Boolean).join(", "),
    placeId:
      props.place_id ||
      props.datasource?.raw?.place_id ||
      props.datasource?.raw?.osm_id ||
      "",
    lon: Number.isFinite(Number(coords[0])) ? Number(coords[0]) : null,
    lat: Number.isFinite(Number(coords[1])) ? Number(coords[1]) : null,
    image: "",
  };
};

const uniqueByName = (items) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = (item?.name || "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const RELIGIOUS_KEYWORDS = [
  "temple",
  "mandir",
  "mosque",
  "masjid",
  "church",
  "cathedral",
  "chapel",
  "gurudwara",
  "gurdwara",
  "synagogue",
  "dargah",
  "shrine",
  "ashram",
  "monastery",
  "stupa",
];

const isReligiousPlace = (place) => {
  const text = `${place?.name || ""} ${place?.address || ""}`.toLowerCase();
  return RELIGIOUS_KEYWORDS.some((word) => text.includes(word));
};

const fetchPlaceImageById = async (placeId, apiKey) => {
  if (!placeId || !apiKey) return "";
  try {
    const response = await axios.get("https://api.geoapify.com/v2/place-details", {
      params: {
        id: placeId,
        features: "details",
        apiKey,
      },
    });
    const features = response?.data?.features || [];
    const details = features.find(
      (f) => f?.properties?.feature_type === "details"
    );
    return details?.properties?.wiki_and_media?.image || "";
  } catch {
    return "";
  }
};

const fetchWikipediaImageByTitle = async (title) => {
  if (!title) return "";
  try {
    const response = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        titles: title,
        prop: "pageimages",
        pithumbsize: 900,
        format: "json",
        origin: "*",
      },
    });
    const pages = response?.data?.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || "";
  } catch {
    return "";
  }
};

const fetchWikipediaImageBySearch = async (query) => {
  if (!query) return "";
  try {
    const search = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        generator: "search",
        gsrsearch: query,
        gsrlimit: 1,
        prop: "pageimages",
        piprop: "thumbnail",
        pithumbsize: 900,
        redirects: 1,
        format: "json",
        origin: "*",
      },
    });
    const pages = search?.data?.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || "";
  } catch {
    return "";
  }
};

const fetchWikipediaImageBySummary = async (title) => {
  if (!title) return "";
  try {
    const response = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`
    );
    const thumb = response?.data?.thumbnail?.source;
    const original = response?.data?.originalimage?.source;
    return thumb || original || "";
  } catch {
    return "";
  }
};

const fetchCommonsImageBySearch = async (query) => {
  if (!query) return "";
  try {
    const search = await axios.get("https://commons.wikimedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: 1,
        format: "json",
        origin: "*",
      },
    });
    const first = search?.data?.query?.search?.[0];
    const pageId = first?.pageid;
    if (!pageId) return "";
    const page = await axios.get("https://commons.wikimedia.org/w/api.php", {
      params: {
        action: "query",
        pageids: pageId,
        prop: "imageinfo",
        iiprop: "url",
        format: "json",
        origin: "*",
      },
    });
    const pages = page?.data?.query?.pages || {};
    const entry = pages[pageId];
    const url = entry?.imageinfo?.[0]?.url;
    return url || "";
  } catch {
    return "";
  }
};

const buildWikiQueries = (name, city, address) => {
  const baseName = String(name || "").trim();
  const cityName = String(city || "").trim();
  const addressLine = String(address || "")
    .split(",")[0]
    .replace(/\b\d{5,6}\b/g, "")
    .trim();

  return [
    `${baseName} ${cityName}`.trim(),
    `${baseName} ${cityName} India`.trim(),
    `${baseName} India`.trim(),
    baseName,
    addressLine ? `${addressLine} ${cityName}`.trim() : "",
    addressLine,
  ].filter(Boolean);
};

const fetchWikipediaImage = async (name, city, address) => {
  const queries = buildWikiQueries(name, city, address);

  for (const q of queries) {
    const image = await fetchWikipediaImageBySearch(q);
    if (image) return image;
  }

  for (const q of queries) {
    const image = await fetchWikipediaImageBySummary(q);
    if (image) return image;
  }

  for (const q of queries) {
    const image = await fetchCommonsImageBySearch(q);
    if (image) return image;
  }

  return "";
};

const fetchGooglePhotoByText = async (query) => {
  if (!GOOGLE_KEY || !query) return "";
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      {
        params: {
          query,
          key: GOOGLE_KEY,
        },
      }
    );
    const place = response?.data?.results?.[0];
    const photoRef = place?.photos?.[0]?.photo_reference;
    if (!photoRef) return "";
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_KEY}`;
  } catch {
    return "";
  }
};

const uniqueImageUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^http:\/\//i, "https://")
    .replace(/[?#].*$/, "");

const dedupeImagesInList = (items, limit) => {
  const seen = new Set();
  return items.map((item, idx) => {
    if (idx >= limit) return item;
    const key = uniqueImageUrl(item?.image);
    if (!key) return item;
    if (seen.has(key)) return { ...item, image: "" };
    seen.add(key);
    return item;
  });
};

const attachImages = async (items, apiKey, city, limit = 6, preferWikipedia = false) => {
  const slice = items.slice(0, limit);
  const wikiImages = preferWikipedia
    ? await Promise.all(
        slice.map((item) =>
          fetchWikipediaImage(item.name, city, item.address)
        )
      )
    : [];
  const images = await Promise.all(
    slice.map((item) => fetchPlaceImageById(item.placeId, apiKey))
  );
  const withGeo = items.map((item, idx) =>
    preferWikipedia && idx < wikiImages.length && wikiImages[idx]
      ? { ...item, image: wikiImages[idx] }
      : idx < images.length && images[idx]
      ? { ...item, image: images[idx] }
      : item
  );
  const needsFallback = withGeo.slice(0, limit);
  const googleImages = await Promise.all(
    needsFallback.map((item) =>
      item.image ? "" : fetchGooglePhotoByText(`${item.name} ${city}`)
    )
  );
  const withGoogle = withGeo.map((item, idx) =>
    idx < googleImages.length && googleImages[idx]
      ? { ...item, image: googleImages[idx] }
      : item
  );
  return dedupeImagesInList(withGoogle, limit);
};

const attachWikipediaOnlyImages = async (items, city, limit = 6) => {
  const slice = items.slice(0, limit);
  const wikiImages = await Promise.all(
    slice.map((item) => fetchWikipediaImage(item.name, city, item.address))
  );
  const withWiki = items.map((item, idx) =>
    idx < wikiImages.length && wikiImages[idx]
      ? { ...item, image: wikiImages[idx] }
      : { ...item, image: "" }
  );
  return dedupeImagesInList(withWiki, limit);
};

const fetchRouteMatrixDurationSeconds = async (fromCoords, toCoords, apiKey) => {
  if (!apiKey || !fromCoords || !toCoords) return null;
  try {
    const response = await axios.post(
      "https://api.geoapify.com/v1/routematrix",
      {
        mode: "drive",
        sources: [{ location: [fromCoords.lon, fromCoords.lat] }],
        targets: [{ location: [toCoords.lon, toCoords.lat] }],
      },
      {
        params: { apiKey },
        headers: { "Content-Type": "application/json" },
      }
    );
    const seconds = response?.data?.sources_to_targets?.[0]?.[0]?.time;
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
};

const toRadians = (deg) => (Number(deg) * Math.PI) / 180;

const haversineKm = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const lat1 = Number(a.lat);
  const lon1 = Number(a.lon);
  const lat2 = Number(b.lat);
  const lon2 = Number(b.lon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }
  const earthKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthKm * y;
};

const routeSamplePoints = (fromCoords, toCoords) => {
  const fractions = [0.2, 0.35, 0.5, 0.65, 0.8];
  return fractions.map((f) => ({
    lat: fromCoords.lat + (toCoords.lat - fromCoords.lat) * f,
    lon: fromCoords.lon + (toCoords.lon - fromCoords.lon) * f,
  }));
};

const isRoadTripMode = (value) => {
  const m = String(value || "").trim().toLowerCase();
  return m === "bus" || m === "cab";
};

exports.getHotels = async (req, res) => {
  try {
    const apiKey = (
      process.env.GEOAPIFY_API_KEY ||
      process.env.GEOAPIFY_KEY ||
      ""
    ).trim();
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEOAPIFY_API_KEY" });
    }
    const city = req.query.city;
    const state = req.query.state || "";
    if (!city) {
      return res.status(400).json({ error: "City required" });
    }

    const cacheKey = `hotels:${city.toLowerCase()}:${String(state || "").toLowerCase()}`;
    const payload = await getOrComputeCached(cacheKey, async () => {
      const coords = await geocodeCity(city, apiKey, state);
      if (!coords) return { places: [] };

      const places = await fetchPlaces({
        lat: coords.lat,
        lon: coords.lon,
        categories:
          "catering.restaurant,catering.cafe,accommodation.hotel,accommodation.guest_house,accommodation.hostel",
        apiKey,
      });

      const mapped = uniqueByName(places.map(mapGeoapifyPlace))
        .filter((place) => !isReligiousPlace(place))
        .slice(0, 4);
      const withImages = await attachImages(mapped, apiKey, city, 4);
      return { places: withImages };
    });
    res.set("Cache-Control", "public, max-age=21600");
    res.json(payload);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data;
    console.error("Geoapify error:", status, data || err.message);
    res.status(status).json({
      error: data?.error || data?.message || "Server error",
    });
  }
};

exports.getFamousPlaces = async (req, res) => {
  try {
    const apiKey = (
      process.env.GEOAPIFY_API_KEY ||
      process.env.GEOAPIFY_KEY ||
      ""
    ).trim();
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEOAPIFY_API_KEY" });
    }
    const city = req.query.city;
    const state = req.query.state || "";
    if (!city) {
      return res.status(400).json({ error: "City required" });
    }

    const cacheKey = `famous:v4:${city.toLowerCase()}:${String(state || "").toLowerCase()}`;
    const payload = await getOrComputeCached(cacheKey, async () => {
      const coords = await geocodeCity(city, apiKey, state);
      if (!coords) return { places: [] };

      const places = await fetchPlaces({
        lat: coords.lat,
        lon: coords.lon,
        categories:
          "entertainment.museum,entertainment.culture,entertainment.culture.gallery,entertainment.culture.theatre,entertainment.zoo,entertainment.aquarium,entertainment.planetarium,building.historic,building.tourism",
        apiKey,
      });

      const mapped = uniqueByName(places.map(mapGeoapifyPlace))
        .filter((place) => !isReligiousPlace(place))
        .slice(0, 4);
      // For famous places, prefer place-details/google images to avoid repeated/religious wiki photos.
      const withImages = await attachImages(mapped, apiKey, city, 4, false);
      return { places: withImages };
    });
    res.set("Cache-Control", "public, max-age=21600");
    res.json(payload);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data;
    console.error("Geoapify error:", status, data || err.message);
    res.status(status).json({
      error: data?.error || data?.message || "Server error",
    });
  }
};

exports.getHiddenGems = async (req, res) => {
  try {
    const apiKey = (
      process.env.GEOAPIFY_API_KEY ||
      process.env.GEOAPIFY_KEY ||
      ""
    ).trim();
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEOAPIFY_API_KEY" });
    }
    const city = req.query.city;
    const state = req.query.state || "";
    if (!city) {
      return res.status(400).json({ error: "City required" });
    }

    const cacheKey = `gems:v1:${city.toLowerCase()}:${String(state || "").toLowerCase()}`;
    const payload = await getOrComputeCached(cacheKey, async () => {
      const coords = await geocodeCity(city, apiKey, state);
      if (!coords) return { places: [] };

      const places = await fetchPlaces({
        lat: coords.lat,
        lon: coords.lon,
        categories:
          "building.historic,building.tourism,building.place_of_worship,entertainment.culture,entertainment.culture.gallery,entertainment.museum,entertainment.aquarium,entertainment.zoo,beach",
        apiKey,
      });

      const mapped = uniqueByName(places.map(mapGeoapifyPlace)).slice(0, 6);
      const withImages = await attachImages(mapped, apiKey, city, 6, true);
      return { places: withImages };
    });
    res.set("Cache-Control", "public, max-age=21600");
    res.json(payload);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data;
    console.error("Geoapify error:", status, data || err.message);
    res.status(status).json({
      error: data?.error || data?.message || "Server error",
    });
  }
};

exports.getFoodCorners = async (req, res) => {
  try {
    const apiKey = (
      process.env.GEOAPIFY_API_KEY ||
      process.env.GEOAPIFY_KEY ||
      ""
    ).trim();
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEOAPIFY_API_KEY" });
    }

    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const mode = String(req.query.mode || "").trim().toLowerCase();
    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    const cacheKey = `food-corners:v3:${from.toLowerCase()}:${to.toLowerCase()}:${mode}`;
    const payload = await getOrComputeCached(cacheKey, async () => {
      const [fromCoords, toCoords] = await Promise.all([
        geocodeCity(from, apiKey),
        geocodeCity(to, apiKey),
      ]);
      if (!fromCoords || !toCoords) {
        return { places: [] };
      }

      const routeSeconds = await fetchRouteMatrixDurationSeconds(
        fromCoords,
        toCoords,
        GEOAPIFY_MATRIX_KEY || apiKey
      );

      const foodCategories =
        "catering.restaurant,catering.fast_food,catering.cafe,catering.food_court";
      let mapped = [];

      if (isRoadTripMode(mode)) {
        const points = routeSamplePoints(fromCoords, toCoords);
        const routeDistanceKm = haversineKm(fromCoords, toCoords);
        const endpointBufferKm = Math.max(
          8,
          Math.min(20, Number.isFinite(routeDistanceKm) ? routeDistanceKm * 0.18 : 12)
        );

        const segmentResults = await Promise.all(
          points.map((point) =>
            fetchPlaces({
              lat: point.lat,
              lon: point.lon,
              categories: foodCategories,
              apiKey,
            })
          )
        );
        mapped = uniqueByName(segmentResults.flat().map(mapGeoapifyPlace))
          .filter((place) => {
            const lat = Number(place?.lat);
            const lon = Number(place?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return true;
            const dFrom = haversineKm({ lat, lon }, fromCoords);
            const dTo = haversineKm({ lat, lon }, toCoords);
            return dFrom > endpointBufferKm && dTo > endpointBufferKm;
          })
          .slice(0, 6);
      }

      if (!mapped.length) {
        const midLat = (fromCoords.lat + toCoords.lat) / 2;
        const midLon = (fromCoords.lon + toCoords.lon) / 2;
        const [fromPlaces, midPlaces, toPlaces] = await Promise.all([
          fetchPlaces({
            lat: fromCoords.lat,
            lon: fromCoords.lon,
            categories: foodCategories,
            apiKey,
          }),
          fetchPlaces({
            lat: midLat,
            lon: midLon,
            categories: foodCategories,
            apiKey,
          }),
          fetchPlaces({
            lat: toCoords.lat,
            lon: toCoords.lon,
            categories: foodCategories,
            apiKey,
          }),
        ]);
        mapped = uniqueByName(
          [...midPlaces, ...fromPlaces, ...toPlaces].map(mapGeoapifyPlace)
        ).slice(0, 6);
      }

      const imageCityHint = isRoadTripMode(mode) ? `${from} ${to}` : to;
      const withImages = await attachWikipediaOnlyImages(mapped, imageCityHint, 6);

      return {
        route: {
          from,
          to,
          mode: mode || "route",
          scope: isRoadTripMode(mode) ? "on-road" : "city-and-midpoint",
          matrixDurationMin:
            Number.isFinite(routeSeconds) && routeSeconds > 0
              ? Math.round(routeSeconds / 60)
              : null,
        },
        places: withImages,
      };
    });

    res.set("Cache-Control", "public, max-age=21600");
    res.json(payload);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data;
    console.error("Geoapify food corners error:", status, data || err.message);
    res.status(status).json({
      error: data?.error || data?.message || "Server error",
    });
  }
};
