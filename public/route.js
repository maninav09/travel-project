const routeForm = document.querySelector("[data-route-form]");
const summaryBox = document.querySelector("[data-summary]");
const mapFrame = document.querySelector("[data-map-frame]");
const mapWrapper = document.querySelector("[data-map-wrapper]");
const mapNote = document.querySelector("[data-map-note]");
const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
const storyBox = document.querySelector("[data-story]");
const lastTripToggle = document.querySelector("[data-last-trip-toggle]");
const previousTripsBox = document.querySelector("[data-previous-trips]");
const tripList = document.querySelector("[data-trip-list]");
const reviewBox = document.querySelector("[data-review-box]");
const reviewInput = document.querySelector("[data-review-input]");
const reviewSave = document.querySelector("[data-review-save]");
const closeTripsBtn = document.querySelector("[data-close-trips]");
const ratingRow = document.querySelector("[data-rating-row]");
const reviewTitle = document.querySelector("[data-review-title]");
const hotelsBtn = document.querySelector("[data-hotels-btn]");
const foodCornersBtn = document.querySelector("[data-food-corners-btn]");
const famousBtn = document.querySelector("[data-famous-btn]");
const aiPlanBtn = document.querySelector("[data-ai-plan-btn]");
const hiddenGemsBtn = document.querySelector("[data-hidden-gems-btn]");
const budgetSplitterBtn = document.querySelector("[data-budget-splitter-btn]");
const safetyDashboardBtn = document.querySelector("[data-safety-dashboard-btn]");
const placesBox = document.querySelector("[data-places-box]");
const placesList = document.querySelector("[data-places-list]");
const placesTitle = document.querySelector("[data-places-title]");
const placesNote = document.querySelector("[data-places-note]");
const aiPlanBox = document.querySelector("[data-ai-plan]");
const aiPlanForm = document.querySelector("[data-ai-plan-form]");
const aiPlanOutput = document.querySelector("[data-ai-plan-output]");
const aiPlanNote = document.querySelector("[data-ai-plan-note]");
const aiCityInput = document.querySelector("[data-ai-city]");
const gemsBox = document.querySelector("[data-gems-box]");
const gemsForm = document.querySelector("[data-gems-form]");
const gemsList = document.querySelector("[data-gems-list]");
const gemsNote = document.querySelector("[data-gems-note]");
const gemsCityInput = document.querySelector("[data-gems-city]");
const gemsNoteInline = document.querySelector("[data-gems-note-inline]");
const budgetBox = document.querySelector("[data-budget-box]");
const budgetForm = document.querySelector("[data-budget-form]");
const budgetNote = document.querySelector("[data-budget-note]");
const budgetOutput = document.querySelector("[data-budget-output]");
const safetyBox = document.querySelector("[data-safety-box]");
const safetyStatus = document.querySelector("[data-safety-status]");
const safetyLinks = document.querySelector("[data-safety-links]");
const safetyChecklist = document.querySelector("[data-safety-checklist]");
const safetyUpdated = document.querySelector("[data-safety-updated]");
const essentialsEmpty = document.querySelector("[data-essentials-empty]");
const placeFilters = Array.from(document.querySelectorAll("[data-filter]"));
const weatherBody = document.querySelector("[data-weather-body]");
const shareBtn = document.querySelector("[data-share-btn]");
const actionButtons = Array.from(document.querySelectorAll(".action-btn"));
const placeReviewBox = document.querySelector("[data-place-review-box]");
const placeReviewTitle = document.querySelector("[data-place-review-title]");
const placeReviewInput = document.querySelector("[data-place-review-input]");
const placeReviewSave = document.querySelector("[data-place-review-save]");
const placeReviewNote = document.querySelector("[data-place-review-note]");
const placeRatingRow = document.querySelector("[data-place-rating-row]");
const costBody = document.querySelector("[data-cost-body]");
const trainBody = document.querySelector("[data-train-body]");
const trainCard = document.querySelector("[data-train-card]");
const busBody = document.querySelector("[data-bus-body]");
const busCard = document.querySelector("[data-bus-card]");
const cabBody = document.querySelector("[data-cab-body]");
const cabCard = document.querySelector("[data-cab-card]");
const statMode = document.querySelector("[data-stat-mode]");
const statDuration = document.querySelector("[data-stat-duration]");
const statWeather = document.querySelector("[data-stat-weather]");
const revealCards = Array.from(document.querySelectorAll(".reveal"));

let currentMode = "Train";
let currentRoute = null;
let currentCity = "";
let currentState = "";
let fallbackCity = "";
let activePlacesKind = "";
let currentFromCity = "";
let currentRouteMode = "";
let activePlaceKey = "";
let currentDurations = {};
let isTrainOpen = false;
let isBusOpen = false;
let isCabOpen = false;
let currentPlaceFilter = "all";
let currentWeatherSummary = "";
let currentWeatherTemp = "";

const isLocalDevHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const apiBase =
  isLocalDevHost && window.location.port && window.location.port !== "5000"
    ? "http://127.0.0.1:5000"
    : "";
const tripHistoryKey = "tripHistory";
const tripReviewsKey = "tripReviews";
const placeReviewsKey = "placeReviews";
let activeTripLabel = "";

const setActiveAction = (button) => {
  actionButtons.forEach((item) => {
    item.classList.toggle("is-active", item === button);
  });
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const setJourneyStats = ({ mode, duration, weather } = {}) => {
  if (statMode && mode) statMode.textContent = `Mode: ${mode}`;
  if (statDuration && duration) statDuration.textContent = `Duration: ${duration}`;
  if (statWeather && weather) statWeather.textContent = `Weather: ${weather}`;
};

const syncEssentialsEmptyState = () => {
  if (!essentialsEmpty) return;
  const hasVisibleDetails =
    (placesBox && !placesBox.classList.contains("is-hidden")) ||
    (aiPlanBox && !aiPlanBox.classList.contains("is-hidden")) ||
    (gemsBox && !gemsBox.classList.contains("is-hidden")) ||
    (budgetBox && !budgetBox.classList.contains("is-hidden")) ||
    (safetyBox && !safetyBox.classList.contains("is-hidden")) ||
    (previousTripsBox && !previousTripsBox.classList.contains("is-hidden")) ||
    (reviewBox && !reviewBox.classList.contains("is-hidden"));
  essentialsEmpty.classList.toggle("is-hidden", hasVisibleDetails);
};

const getTripHistory = () => {
  try {
    const raw = localStorage.getItem(tripHistoryKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveTripHistory = (items) => {
  localStorage.setItem(tripHistoryKey, JSON.stringify(items));
};

const addTripHistoryItem = ({ from, to, mode }) => {
  if (!from || !to) return;
  const label = `${from} \u2192 ${to}`;
  const history = getTripHistory().filter((item) => item.label !== label);
  history.unshift({
    label,
    mode: mode || "Train",
    date: new Date().toLocaleDateString(),
  });
  const trimmed = history.slice(0, 3);
  saveTripHistory(trimmed);
  const reviews = getTripReviews();
  const keep = new Set(trimmed.map((item) => item.label));
  Object.keys(reviews).forEach((key) => {
    if (!keep.has(key)) delete reviews[key];
  });
  localStorage.setItem(tripReviewsKey, JSON.stringify(reviews));
};

const renderPreviousTrips = () => {
  if (!tripList) return;
  const history = getTripHistory();
  const lastRoute = localStorage.getItem("lastRoute");
  const items = history.length
    ? history
    : lastRoute
    ? [{ label: lastRoute, mode: "Last", date: "Recent" }]
    : [];

  if (!items.length) {
    tripList.innerHTML = '<div class="trip-item">No previous trips yet.</div>';
    return;
  }

  const reviews = getTripReviews();
  tripList.innerHTML = items
    .map(
      (trip) => {
        const saved = reviews[trip.label];
        const rating = saved?.rating ? `${saved.rating}/5` : "-";
        return `
        <div class="trip-item" data-label="${trip.label}">
          <div>
            ${trip.label}
            <span>${trip.mode} - ${trip.date}</span>
          </div>
          <div class="trip-meta">
            <strong>${rating}</strong>
            <button class="trip-review-btn" type="button" data-trip-review-btn>Review</button>
          </div>
        </div>
      `;
      }
    )
    .join("");
};

const getTripReviews = () => {
  try {
    const raw = localStorage.getItem(tripReviewsKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveTripReview = (label, review) => {
  const reviews = getTripReviews();
  reviews[label] = review;
  localStorage.setItem(tripReviewsKey, JSON.stringify(reviews));
};

const getPlaceReviews = () => {
  try {
    const raw = localStorage.getItem(placeReviewsKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const savePlaceReview = (key, review) => {
  const reviews = getPlaceReviews();
  reviews[key] = review;
  localStorage.setItem(placeReviewsKey, JSON.stringify(reviews));
};

const setRating = (value) => {
  if (!ratingRow) return;
  const stars = Array.from(ratingRow.querySelectorAll("[data-star]"));
  stars.forEach((star) => {
    const starValue = Number(star.dataset.star || 0);
    star.classList.toggle("is-active", starValue <= value);
  });
  ratingRow.dataset.value = String(value);
};

const setPlaceRating = (value) => {
  if (!placeRatingRow) return;
  const stars = Array.from(placeRatingRow.querySelectorAll("[data-place-star]"));
  stars.forEach((star) => {
    const starValue = Number(star.dataset.placeStar || 0);
    star.classList.toggle("is-active", starValue <= value);
  });
  placeRatingRow.dataset.value = String(value);
};

const resetReviewBox = () => {
  if (reviewInput) reviewInput.value = "";
  setRating(0);
};

const resetPlaceReviewBox = () => {
  if (placeReviewInput) placeReviewInput.value = "";
  if (placeReviewNote) placeReviewNote.textContent = "";
  setPlaceRating(0);
  activePlaceKey = "";
  if (placeReviewBox) placeReviewBox.classList.add("is-hidden");
};

const requireLogin = () => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    const intendedPath = `${window.location.pathname}${window.location.search}`;
    localStorage.setItem("postLoginRedirect", intendedPath);
    window.location.href = `login.html?next=${encodeURIComponent(intendedPath)}`;
    return false;
  }
  return true;
};

const resetPlacesUI = () => {
  if (placesList) placesList.innerHTML = "";
  if (placesNote) placesNote.textContent = "";
  if (placesBox) placesBox.classList.add("is-hidden");
  activePlacesKind = "";
  currentPlaceFilter = "all";
  placeFilters.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.filter === "all");
  });
  setActiveAction(null);
  resetPlaceReviewBox();
  syncEssentialsEmptyState();
};

const resetAiPlanUI = () => {
  if (aiPlanNote) aiPlanNote.textContent = "";
  if (aiPlanOutput) aiPlanOutput.innerHTML = "";
  if (aiPlanBox) aiPlanBox.classList.add("is-hidden");
};

const resetGemsUI = () => {
  if (gemsNoteInline) gemsNoteInline.textContent = "";
  if (gemsList) gemsList.innerHTML = "";
  if (gemsBox) gemsBox.classList.add("is-hidden");
};

const resetBudgetUI = () => {
  if (budgetNote) budgetNote.textContent = "";
  if (budgetOutput) budgetOutput.innerHTML = "";
  if (budgetBox) budgetBox.classList.add("is-hidden");
};

const resetSafetyUI = () => {
  if (safetyBox) safetyBox.classList.add("is-hidden");
};

const resetExtrasUI = () => {
  resetAiPlanUI();
  resetGemsUI();
  resetBudgetUI();
  resetSafetyUI();
};

const setAiPlanVisibility = (isOpen) => {
  if (!aiPlanBox) return;
  aiPlanBox.classList.toggle("is-hidden", !isOpen);
  if (isOpen) {
    resetGemsUI();
    resetBudgetUI();
    resetSafetyUI();
    if (placesBox) placesBox.classList.add("is-hidden");
    if (previousTripsBox) previousTripsBox.classList.add("is-hidden");
    if (reviewBox) reviewBox.classList.add("is-hidden");
    syncCityInputs();
  }
  syncEssentialsEmptyState();
};

const setGemsVisibility = (isOpen) => {
  if (!gemsBox) return;
  gemsBox.classList.toggle("is-hidden", !isOpen);
  if (isOpen) {
    resetAiPlanUI();
    resetBudgetUI();
    resetSafetyUI();
    if (placesBox) placesBox.classList.add("is-hidden");
    if (previousTripsBox) previousTripsBox.classList.add("is-hidden");
    if (reviewBox) reviewBox.classList.add("is-hidden");
    syncCityInputs();
  }
  syncEssentialsEmptyState();
};

const setBudgetVisibility = (isOpen) => {
  if (!budgetBox) return;
  budgetBox.classList.toggle("is-hidden", !isOpen);
  if (isOpen) {
    resetAiPlanUI();
    resetGemsUI();
    resetSafetyUI();
    if (placesBox) placesBox.classList.add("is-hidden");
    if (previousTripsBox) previousTripsBox.classList.add("is-hidden");
    if (reviewBox) reviewBox.classList.add("is-hidden");
  }
  syncEssentialsEmptyState();
};

const setSafetyVisibility = (isOpen) => {
  if (!safetyBox) return;
  safetyBox.classList.toggle("is-hidden", !isOpen);
  if (isOpen) {
    resetAiPlanUI();
    resetGemsUI();
    resetBudgetUI();
    if (placesBox) placesBox.classList.add("is-hidden");
    if (previousTripsBox) previousTripsBox.classList.add("is-hidden");
    if (reviewBox) reviewBox.classList.add("is-hidden");
  }
  syncEssentialsEmptyState();
};

const buildSafetyLinks = (city) => {
  const location = String(city || currentCity || "").trim() || "India";
  const queryBase = encodeURIComponent(`${location} flood landslide weather alert`);
  return [
    {
      label: "IMD weather warnings",
      url: "https://mausam.imd.gov.in/",
    },
    {
      label: "NDMA disaster updates",
      url: "https://ndma.gov.in/",
    },
    {
      label: `Latest alerts for ${location}`,
      url: `https://news.google.com/search?q=${queryBase}&hl=en-IN&gl=IN&ceid=IN:en`,
    },
  ];
};

const buildEmergencyChecklist = (city = "", weatherSummary = "") => {
  const text = `${city} ${weatherSummary}`.toLowerCase();
  const base = [
    "Government ID, emergency contacts, and travel tickets",
    "Charged phone, power bank, and charging cable",
    "Basic medicines, ORS, and personal prescriptions",
    "Cash backup and one extra card",
    "Small torch and whistle",
  ];
  if (/(rain|storm|flood|drizzle|showers|thunder)/.test(text)) {
    base.push("Quick-dry bag cover and waterproof pouch");
    base.push("Non-slip footwear and light rain jacket");
  }
  if (/(snow|cold|fog)/.test(text)) {
    base.push("Thermal layer, gloves, and warm cap");
  }
  if (/(heat|clear sky|sun)/.test(text)) {
    base.push("Sunscreen, hat, and extra water bottle");
  }
  if (/(leh|ladakh|hill|mountain|rishikesh)/.test(text)) {
    base.push("Offline map and altitude-safe hydration plan");
  }
  return base.slice(0, 8);
};

const inferSafetyLevel = (weatherSummary = "") => {
  const text = String(weatherSummary || "").toLowerCase();
  if (/(thunder|heavy|hail|storm|flood)/.test(text)) return "High caution";
  if (/(rain|showers|fog|snow)/.test(text)) return "Medium caution";
  return "Normal caution";
};

const renderSafetyDashboard = ({ city, weatherSummary, weatherTemp } = {}) => {
  const safeCity = String(city || currentCity || "").trim() || "destination city";
  const summary = String(weatherSummary || currentWeatherSummary || "Weather unavailable");
  const temp = String(weatherTemp || currentWeatherTemp || "N/A");
  const level = inferSafetyLevel(summary);

  if (safetyStatus) {
    safetyStatus.textContent = `${safeCity}: ${summary}. Current temp: ${temp}. Safety level: ${level}.`;
  }
  if (safetyUpdated) {
    safetyUpdated.textContent = `Updated ${new Date().toLocaleString()}`;
  }
  if (safetyLinks) {
    const links = buildSafetyLinks(safeCity);
    safetyLinks.innerHTML = links
      .map(
        (item) =>
          `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(
            item.label
          )}</a>`
      )
      .join("");
  }
  if (safetyChecklist) {
    const checklist = buildEmergencyChecklist(safeCity, summary);
    safetyChecklist.innerHTML = checklist
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
  }
};

const skeletonRows = (count = 3) =>
  Array.from({ length: count }, () => '<div class="skeleton"></div>').join("");

const syncCityInputs = () => {
  const cityValue = currentCity || "";
  if (aiCityInput) aiCityInput.value = cityValue;
  if (gemsCityInput) gemsCityInput.value = cityValue;
};

const updateShareLink = (from, to, mode) => {
  if (!from || !to) return "";
  const url = new URL(window.location.href);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  if (mode) {
    url.searchParams.set("mode", mode);
  }
  window.history.replaceState({}, "", url.toString());
  return url.toString();
};

const loadWeather = async (city) => {
  if (!weatherBody) return;
  if (!city) {
    weatherBody.textContent = "Search a route to see the forecast.";
    setJourneyStats({ weather: "--" });
    return;
  }
  weatherBody.textContent = `Loading forecast for ${city}...`;
  setJourneyStats({ weather: "Loading..." });
  try {
    const res = await fetch(
      `${apiBase}/api/weather?city=${encodeURIComponent(city)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Weather unavailable");
    const forecast = data?.forecast;
    if (!forecast) throw new Error("Weather unavailable");
    const tempNow =
      forecast.currentTemp === "N/A"
        ? "N/A"
        : `${forecast.currentTemp} C`;
    const tempHigh =
      forecast.todayHigh === "N/A" ? "N/A" : `${forecast.todayHigh} C`;
    const tempLow =
      forecast.todayLow === "N/A" ? "N/A" : `${forecast.todayLow} C`;
    const lines = [
      `${forecast.city}: ${forecast.summary}`,
      `Now: ${tempNow}, ${forecast.currentCondition}`,
      `Today: High ${tempHigh}, Low ${tempLow}`,
    ];
    currentWeatherSummary = forecast.currentCondition || forecast.summary || "";
    currentWeatherTemp = tempNow;
    weatherBody.textContent = lines.join(" - ");
    setJourneyStats({ weather: `${forecast.currentCondition} ${tempNow}` });
    renderSafetyDashboard({
      city: forecast.city || city,
      weatherSummary: currentWeatherSummary,
      weatherTemp: currentWeatherTemp,
    });
  } catch (error) {
    currentWeatherSummary = "Weather unavailable";
    currentWeatherTemp = "N/A";
    weatherBody.textContent = `Unable to load weather: ${error.message}`;
    setJourneyStats({ weather: "Unavailable" });
    renderSafetyDashboard({
      city: city || currentCity,
      weatherSummary: currentWeatherSummary,
      weatherTemp: currentWeatherTemp,
    });
  }
};
const parseDurationToMinutes = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    const textValue = value.text || value.duration || value.label || "";
    const numericValue = Number(value.value);
    if (textValue) return parseDurationToMinutes(textValue);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      // Some APIs return duration.value in seconds.
      return numericValue > 1000 ? Math.round(numericValue / 60) : numericValue;
    }
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
    const numeric = Number(value.trim());
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }
  const text = String(value).toLowerCase();
  const dayMatch = text.match(/(\d+)\s*(d|day|days)\b/);
  const hourMatch = text.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b/);
  const minMatch = text.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  const days = dayMatch ? Number(dayMatch[1]) : 0;
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const mins = minMatch ? Number(minMatch[1]) : 0;
  const total = days * 24 * 60 + hours * 60 + mins;
  if (total > 0) return total;
  const colonMatch = text.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (colonMatch) {
    const h = Number(colonMatch[1]);
    const m = Number(colonMatch[2]);
    const minutes = h * 60 + m;
    return minutes > 0 ? minutes : null;
  }
  return total > 0 ? total : null;
};

const normalizeDurations = (durations) => {
  const source = durations && typeof durations === "object" ? durations : {};
  return {
    train: source.train ?? source.Train ?? "",
    bus: source.bus ?? source.Bus ?? "",
    cab: source.cab ?? source.Cab ?? "",
  };
};

const durationToLabel = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return minutesToText(value);
  if (typeof value === "object") {
    if (typeof value.text === "string" && value.text.trim()) return value.text.trim();
    const numericValue = Number(value.value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      const mins = numericValue > 1000 ? Math.round(numericValue / 60) : numericValue;
      return minutesToText(mins);
    }
  }
  return "";
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

const normalizeModeKey = (value) => {
  const key = String(value || "").toLowerCase();
  if (key.includes("train")) return "train";
  if (key.includes("bus")) return "bus";
  if (key.includes("cab")) return "cab";
  return "train";
};

const ensureDurationsByMode = (durations, route, fallbackMode) => {
  const normalizedDurations = normalizeDurations(durations);
  const hasAny = ["train", "bus", "cab"].some((mode) =>
    parseDurationToMinutes(normalizedDurations?.[mode])
  );
  if (hasAny) return normalizedDurations;
  const baseMinutes = parseDurationToMinutes(route?.duration);
  if (!baseMinutes) return normalizedDurations;
  const baseMode = normalizeModeKey(route?.mode || fallbackMode);
  const multipliers = { train: 1, bus: 1.15, cab: 0.85 };
  const base = baseMinutes / multipliers[baseMode];
  return {
    train: minutesToText(base * multipliers.train),
    bus: minutesToText(base * multipliers.bus),
    cab: minutesToText(base * multipliers.cab),
  };
};

const estimateCostRange = (mode, minutes) => {
  if (!minutes) return null;
  const hours = Math.max(minutes / 60, 0.5);
  const rateMap = {
    train: { min: 150, max: 300, base: 150 },
    bus: { min: 100, max: 220, base: 120 },
    cab: { min: 700, max: 1200, base: 800 },
  };
  const rates = rateMap[mode] || rateMap.train;
  const low = Math.max(rates.base, Math.round(hours * rates.min));
  const high = Math.max(rates.base + 200, Math.round(hours * rates.max));
  const round10 = (n) => Math.round(n / 10) * 10;
  return { low: round10(low), high: round10(high), hours };
};

const formatCost = (range) => {
  if (!range) return "N/A";
  return `Rs ${range.low} - Rs ${range.high}`;
};

const renderCostComparison = (durations = {}) => {
  if (!costBody) return;
  const normalizedDurations = normalizeDurations(durations);
  const entries = [
    { mode: "train", label: "Train", duration: durationToLabel(normalizedDurations.train) },
    { mode: "bus", label: "Bus", duration: durationToLabel(normalizedDurations.bus) },
    { mode: "cab", label: "Cab", duration: durationToLabel(normalizedDurations.cab) },
  ];

  const enriched = entries.map((entry) => {
    const minutes = parseDurationToMinutes(entry.duration);
    const cost = estimateCostRange(entry.mode, minutes);
    const mid = cost ? (cost.low + cost.high) / 2 : null;
    return { ...entry, minutes, cost, mid };
  });

  const available = enriched.filter((e) => e.minutes && e.cost);
  if (!available.length) {
    const routeLabel =
      currentFromCity && currentCity ? `${currentFromCity} -> ${currentCity}` : "Current route";
    costBody.innerHTML = `
      <div class="cost-insight">
        <strong>${routeLabel}</strong>
        <span>Cost comparison will appear once durations are available for Train, Bus, or Cab.</span>
      </div>
    `;
    return;
  }

  const cheapest = available.reduce((a, b) => (a.mid < b.mid ? a : b));
  const fastest = available.reduce((a, b) => (a.minutes < b.minutes ? a : b));

  const maxCost = Math.max(...available.map((e) => e.mid || 0));
  const maxTime = Math.max(...available.map((e) => e.minutes || 0));
  const scored = available.map((e) => ({
    ...e,
    score:
      (e.mid / maxCost) * 0.6 +
      (e.minutes / maxTime) * 0.4,
  }));
  const bestOverall = scored.reduce((a, b) => (a.score < b.score ? a : b));
  const routeLabel =
    currentFromCity && currentCity ? `${currentFromCity} -> ${currentCity}` : "Current route";

  costBody.innerHTML = enriched
    .map((entry) => {
      const tags = [];
      if (entry.mode === bestOverall.mode) tags.push("Best overall");
      if (entry.mode === cheapest.mode) tags.push("Cheapest");
      if (entry.mode === fastest.mode) tags.push("Fastest");
      const tagMarkup = tags.length
        ? `<span class="cost-tag">${tags.join(" - ")}</span>`
        : "";
      const durationText = entry.duration ? entry.duration : "N/A";
      const costText = formatCost(entry.cost);
      return `
        <div class="cost-row">
          <div>
            <strong>${entry.label}</strong>
            <div class="cost-meta">Duration: ${durationText}</div>
          </div>
          <div>
            <div><strong>${costText}</strong></div>
            ${tagMarkup}
          </div>
        </div>
      `;
    })
    .join("");

  costBody.innerHTML =
    `
      <div class="cost-insight">
        <strong>${routeLabel}</strong>
        <span>Most cost-effective mode: <b>${bestOverall.label}</b></span>
        <span>Cheapest: ${cheapest.label} (${formatCost(cheapest.cost)}) - Fastest: ${fastest.label} (${fastest.duration})</span>
      </div>
      <div class="cost-meta">Estimates in INR based on typical rates.</div>
    ` +
    costBody.innerHTML;
};

const renderTrains = (payload) => {
  if (!trainBody) return;
  const trains = Array.isArray(payload?.trains) ? payload.trains : [];
  if (!trains.length) {
    trainBody.textContent = "No trains found for this route.";
    return;
  }
  trainBody.innerHTML = `
    <div class="train-list">
      ${trains
        .map((train) => {
          const classes = train?.classes || {};
          const classTags = [
            classes.ac ? "AC" : null,
            classes.sleeper ? "Sleeper" : null,
            classes.general ? "General" : null,
          ].filter(Boolean);
          return `
            <div class="train-item">
              <strong>${train.name} (${train.number})</strong>
              <div class="train-meta">
                <span>Engine: ${train.engineNumber}</span>
                <span>Platform: ${train.platform}</span>
              </div>
              <div class="train-meta">
                <span>${train.fromCity} ${train.departureTime}</span>
                <span>\u2192</span>
                <span>${train.toCity} ${train.arrivalTime}</span>
              </div>
              <div class="train-classes">
                ${classTags.map((tag) => `<span class="train-class-tag">${tag}</span>`).join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
};

const loadTrains = async (from, to) => {
  if (!trainBody) return;
  if (!from || !to) {
    trainBody.textContent = "Choose Train to see timetable, classes, and platform.";
    return;
  }
  trainBody.innerHTML = skeletonRows(3);
  try {
    const response = await fetch(
      `${apiBase}/api/trains?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Trains unavailable");
    }
    renderTrains(data);
  } catch (error) {
    trainBody.textContent = `Unable to load trains: ${error.message}`;
  }
};

const setTrainOpen = (open) => {
  isTrainOpen = open;
  if (trainCard) trainCard.classList.toggle("is-hidden", !open);
  if (!open && trainBody) {
    trainBody.textContent = "Choose Train to see timetable, classes, and platform.";
  }
};

const renderBuses = (payload) => {
  if (!busBody) return;
  const buses = Array.isArray(payload?.buses) ? payload.buses : [];
  if (!buses.length) {
    busBody.textContent = "No buses found for this route.";
    return;
  }

  busBody.innerHTML = `
    <div class="train-list">
      ${buses
        .map(
          (bus) => `
        <div class="train-item">
          <strong>${bus.operator} (${bus.busNumber})</strong>
          <div class="train-meta">
            <span>${bus.type}</span>
            <span>Seats: ${bus.seatsAvailable}</span>
            <span>Fare: Rs ${bus.fare}</span>
          </div>
          <div class="train-meta">
            <span>${bus.fromCity} ${bus.departureTime}</span>
            <span>-></span>
            <span>${bus.toCity} ${bus.arrivalTime}</span>
          </div>
          <div class="train-meta">
            <span>Boarding: ${bus.boardingPoint}</span>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
};

const renderCabs = (payload) => {
  if (!cabBody) return;
  const cabs = Array.isArray(payload?.cabs) ? payload.cabs : [];
  if (!cabs.length) {
    cabBody.textContent = "No cabs found for this route.";
    return;
  }

  cabBody.innerHTML = `
    <div class="train-list">
      ${cabs
        .map(
          (cab) => `
        <div class="train-item">
          <strong>${cab.provider} - ${cab.vehicleType}</strong>
          <div class="train-meta">
            <span>${cab.carModel}</span>
            <span>Driver: ${cab.driverName} (${cab.driverRating}/5)</span>
            <span>Seats: ${cab.seats}</span>
          </div>
          <div class="train-meta">
            <span>${cab.fromCity} to ${cab.toCity}</span>
            <span>Pickup: ${cab.pickupTime}</span>
            <span>ETA: ${cab.eta}</span>
          </div>
          <div class="train-meta">
            <span>Fare: Rs ${cab.fare}</span>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
};

const loadBusDetails = async (from, to) => {
  if (!busBody) return;
  if (!from || !to) {
    busBody.textContent = "Choose Bus to see bus operators and timings.";
    return;
  }
  busBody.innerHTML = skeletonRows(3);
  try {
    const response = await fetch(
      `${apiBase}/api/buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Buses unavailable");
    }
    renderBuses(data);
  } catch (error) {
    busBody.textContent = `Unable to load buses: ${error.message}`;
  }
};

const loadCabDetails = async (from, to) => {
  if (!cabBody) return;
  if (!from || !to) {
    cabBody.textContent = "Choose Cab to see cabs and driver details.";
    return;
  }
  cabBody.innerHTML = skeletonRows(3);
  try {
    const response = await fetch(
      `${apiBase}/api/cabs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Cabs unavailable");
    }
    renderCabs(data);
  } catch (error) {
    cabBody.textContent = `Unable to load cabs: ${error.message}`;
  }
};

const setBusOpen = (open) => {
  isBusOpen = open;
  if (busCard) busCard.classList.toggle("is-hidden", !open);
  if (!open && busBody) {
    busBody.textContent = "Choose Bus to see bus operators and timings.";
  }
};

const setCabOpen = (open) => {
  isCabOpen = open;
  if (cabCard) cabCard.classList.toggle("is-hidden", !open);
  if (!open && cabBody) {
    cabBody.textContent = "Choose Cab to see cabs and driver details.";
  }
};

const updateMap = (from, to) => {
  if (!mapFrame || !mapWrapper) return;
  const query = `${from} to ${to}`;
  const src = `https://www.google.com/maps?output=embed&q=${encodeURIComponent(query)}`;
  mapFrame.src = src;
  mapWrapper.classList.remove("is-empty");
  if (mapNote) mapNote.textContent = "Route preview";
};

const updateMapToPlace = (placeQuery) => {
  if (!mapFrame || !mapWrapper || !placeQuery) return;
  let src = `https://www.google.com/maps?output=embed&q=${encodeURIComponent(placeQuery)}`;
  if (currentFromCity) {
    src = `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(
      currentFromCity
    )}&daddr=${encodeURIComponent(placeQuery)}`;
  }
  mapFrame.src = src;
  mapWrapper.classList.remove("is-empty");
  if (mapNote) mapNote.textContent = "Directions preview";
};
const renderStory = ({ from, to, mode, durations }) => {
  if (!storyBox) return;
  const bestTime = "October to March";
  const pace =
    mode === "Train"
      ? "scenic and relaxed"
      : mode === "Bus"
      ? "budget-friendly and social"
      : "flexible and fast-paced";
  const durationLine =
    durations?.train || durations?.bus || durations?.cab
      ? `Train ${durations.train || "N/A"}  -  Bus ${durations.bus || "N/A"}  -  Cab ${durations.cab || "N/A"}`
      : "";

  storyBox.innerHTML = `
    <div class="story-title">Route story</div>
    <p>From <strong>${from}</strong> to <strong>${to}</strong> by <strong>${mode}</strong> feels ${pace}. ${
      durationLine ? `Estimated travel: ${durationLine}.` : ""
    }</p>
    <p><strong>Best time:</strong> ${bestTime}. <strong>Tip:</strong> Pack light layers and plan a sunrise stop.</p>
  `;
};


const loadRoute = async (from, to, mode) => {
  if (!from || !to) return;
  currentCity = to;
  currentFromCity = from;
  currentRouteMode = mode || currentMode;
  resetPlacesUI();
  resetExtrasUI();
  syncCityInputs();
  if (summaryBox) {
    summaryBox.innerHTML = `
      <h3>Route Summary</h3>
      <p><strong>Mode:</strong> ${mode}</p>
      <p><strong>From:</strong> ${from}</p>
      <p><strong>To:</strong> ${to}</p>
      <p>Loading route details...</p>
    `;
  }
  setJourneyStats({ mode: mode || currentMode, duration: "Loading..." });

  try {
    const modeParam = `mode=${encodeURIComponent(mode)}&`;
    const response = await fetch(
      `${apiBase}/api/routes?${modeParam}from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    const data = await response.json();
    const route = data?.routes?.[0];
    if (!response.ok || !route) {
      throw new Error("No route found");
    }

    currentRoute = route;
    currentCity = route.to || to;
    currentFromCity = route.from || from;
    const displayMode = mode || route.mode || currentMode;
    currentRouteMode = displayMode;
    localStorage.setItem("lastRoute", `${from} \u2192 ${to}`);
    addTripHistoryItem({ from: route.from || from, to: route.to || to, mode: displayMode });
    updateShareLink(route.from || from, route.to || to, displayMode);
    loadWeather(route.to || to);

    const durations = ensureDurationsByMode(
      route.durationByMode || {},
      route,
      currentMode
    );
    currentDurations = durations;
    renderCostComparison(durations);
    const durationLine =
      durations.train || durations.bus || durations.cab
        ? `Train: ${durations.train || "N/A"} - Bus: ${durations.bus || "N/A"} - Cab: ${durations.cab || "N/A"}`
        : route.duration
        ? `Duration: ${route.duration}`
        : "";
    const headlineDuration =
      durations[normalizeModeKey(displayMode)] || route.duration || "N/A";
    setJourneyStats({ mode: displayMode, duration: headlineDuration });

    if (summaryBox) {
      summaryBox.innerHTML = `
        <h3>Route Summary</h3>
        <p><strong>Mode:</strong> ${displayMode}</p>
        <p><strong>From:</strong> ${route.from}</p>
        <p><strong>To:</strong> ${route.to}</p>
        ${durationLine ? `<p>${durationLine}</p>` : ""}
        <p>${route.summary || "Curated stops and stays for your journey."}</p>
      `;
    }

    renderStory({
      from: route.from || from,
      to: route.to || to,
      mode: displayMode,
      durations,
    });
    updateMap(from, to);
    if (displayMode === "Train") {
      setTrainOpen(true);
      setBusOpen(false);
      setCabOpen(false);
      loadTrains(from, to);
    } else if (displayMode === "Bus") {
      setTrainOpen(false);
      setBusOpen(true);
      setCabOpen(false);
      loadBusDetails(from, to);
    } else if (displayMode === "Cab") {
      setTrainOpen(false);
      setBusOpen(false);
      setCabOpen(true);
      loadCabDetails(from, to);
    } else if (trainBody) {
      setTrainOpen(false);
      setBusOpen(false);
      setCabOpen(false);
    }
    
  } catch (err) {
    currentRoute = null;
    currentCity = to;
    currentFromCity = from;
    currentRouteMode = mode || currentMode;
    updateShareLink(from, to, mode || currentMode);
    loadWeather(to);
    if (summaryBox) {
      summaryBox.innerHTML = `
        <h3>Route Summary</h3>
        <p><strong>Mode:</strong> ${mode}</p>
        <p><strong>From:</strong> ${from}</p>
        <p><strong>To:</strong> ${to}</p>
        <p>Unable to load route details. Try again.</p>
      `;
    }
    renderStory({ from, to, mode, durations: {} });
    currentDurations = {};
    renderCostComparison({});
    setJourneyStats({ mode: mode || currentMode, duration: "Unavailable" });
    updateMap(from, to);
    if (mode === "Train") {
      setTrainOpen(true);
      setBusOpen(false);
      setCabOpen(false);
      loadTrains(from, to);
    } else if (mode === "Bus") {
      setTrainOpen(false);
      setBusOpen(true);
      setCabOpen(false);
      loadBusDetails(from, to);
    } else if (mode === "Cab") {
      setTrainOpen(false);
      setBusOpen(false);
      setCabOpen(true);
      loadCabDetails(from, to);
    } else if (trainBody) {
      setTrainOpen(false);
      setBusOpen(false);
      setCabOpen(false);
    }
    
  }
};

if (reviewSave) {
  reviewSave.addEventListener("click", () => {
    const value = reviewInput ? reviewInput.value : "";
    const rating = ratingRow ? Number(ratingRow.dataset.value || 0) : 0;
    if (!activeTripLabel) return;
    saveTripReview(activeTripLabel, { text: value, rating });
    renderPreviousTrips();
    if (reviewSave) reviewSave.textContent = "Saved";
    resetReviewBox();
    setTimeout(() => {
      if (reviewSave) reviewSave.textContent = "Save Review";
    }, 1200);
  });
}

if (placeReviewSave) {
  placeReviewSave.addEventListener("click", () => {
    const value = placeReviewInput ? placeReviewInput.value : "";
    const rating = placeRatingRow ? Number(placeRatingRow.dataset.value || 0) : 0;
    if (!activePlaceKey) return;
    savePlaceReview(activePlaceKey, {
      text: value,
      rating,
      updatedAt: new Date().toISOString(),
    });
    if (placeReviewNote) placeReviewNote.textContent = "Saved";
    if (placesList) renderPlaces(getCurrentPlaces());
    setTimeout(() => {
      if (placeReviewNote) placeReviewNote.textContent = "";
    }, 1200);
  });
}

const setLastTripVisibility = (isOpen) => {
  if (previousTripsBox) previousTripsBox.classList.toggle("is-hidden", !isOpen);
  if (reviewBox) reviewBox.classList.toggle("is-hidden", true);
  if (closeTripsBtn) closeTripsBtn.classList.toggle("is-hidden", !isOpen);
  if (lastTripToggle) lastTripToggle.dataset.open = isOpen ? "true" : "false";
  if (isOpen) {
    if (placesBox) placesBox.classList.add("is-hidden");
    resetAiPlanUI();
    resetGemsUI();
    resetBudgetUI();
    resetSafetyUI();
    renderPreviousTrips();
  }
  syncEssentialsEmptyState();
};

if (lastTripToggle) {
  lastTripToggle.dataset.open = "false";
  lastTripToggle.addEventListener("click", () => {
    const isOpen = lastTripToggle.dataset.open === "true";
    setActiveAction(isOpen ? null : lastTripToggle);
    setLastTripVisibility(!isOpen);
  });
}

if (closeTripsBtn) {
  closeTripsBtn.addEventListener("click", () => {
    if (previousTripsBox) previousTripsBox.classList.add("is-hidden");
    if (tripList) tripList.innerHTML = "";
    if (reviewBox) reviewBox.classList.add("is-hidden");
    if (closeTripsBtn) closeTripsBtn.classList.add("is-hidden");
    if (lastTripToggle) lastTripToggle.dataset.open = "false";
    setActiveAction(null);
    syncEssentialsEmptyState();
  });
}

if (tripList) {
  tripList.addEventListener("click", (event) => {
    const reviewBtn = event.target.closest("[data-trip-review-btn]");
    const item = event.target.closest(".trip-item");
    if (!item) return;
    activeTripLabel = item.dataset.label || item.textContent.trim();
    if (reviewTitle) reviewTitle.textContent = `Review: ${activeTripLabel}`;
    resetReviewBox();
    const reviews = getTripReviews();
    const saved = reviews[activeTripLabel];
    if (saved) {
      setRating(Number(saved.rating || 0));
      if (reviewInput) reviewInput.value = saved.text || "";
    }
    const meta = item.querySelector(".trip-meta strong");
    if (meta) {
      meta.textContent = saved?.rating ? `${saved.rating}/5` : "0/5";
    }
    if (reviewBox) reviewBox.classList.remove("is-hidden");
    if (reviewBtn) {
      if (previousTripsBox) previousTripsBox.classList.remove("is-hidden");
    }
    syncEssentialsEmptyState();
  });
}

if (ratingRow) {
  ratingRow.addEventListener("click", (event) => {
    const star = event.target.closest("[data-star]");
    if (!star) return;
    setRating(Number(star.dataset.star || 0));
  });
}

if (placeRatingRow) {
  placeRatingRow.addEventListener("click", (event) => {
    const star = event.target.closest("[data-place-star]");
    if (!star) return;
    setPlaceRating(Number(star.dataset.placeStar || 0));
  });
}

const buildPlaceKey = (place) => {
  const id = place?.placeId || "";
  const name = (place?.name || "").trim();
  const address = (place?.address || "").trim();
  if (id) return id;
  return [name, address, currentCity].filter(Boolean).join("|").toLowerCase();
};

let cachedPlaces = [];
const setCurrentPlaces = (places) => {
  cachedPlaces = Array.isArray(places) ? places : [];
};
const getCurrentPlaces = () => cachedPlaces;

const placePexelsCache = new Map();

const fetchPexelsImageForPlace = async (placeName, city) => {
  const name = String(placeName || "").trim();
  const nearCity = String(city || "").trim();
  if (!name) return "";
  const cacheKey = `${name}|${nearCity}`.toLowerCase();
  if (placePexelsCache.has(cacheKey)) return placePexelsCache.get(cacheKey);
  try {
    const query = nearCity ? `${name} ${nearCity} landmark` : `${name} landmark`;
    const res = await fetch(
      `${apiBase}/api/photos/pexels?query=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      placePexelsCache.set(cacheKey, "");
      return "";
    }
    const data = await res.json();
    const image = typeof data?.image === "string" ? data.image : "";
    placePexelsCache.set(cacheKey, image);
    return image;
  } catch {
    placePexelsCache.set(cacheKey, "");
    return "";
  }
};

const fillMissingPlaceImages = async (places, city) => {
  const list = Array.isArray(places) ? places : [];
  return Promise.all(
    list.map(async (place) => {
      if (place?.image) return place;
      const image = await fetchPexelsImageForPlace(place?.name, city);
      return image ? { ...place, image } : place;
    })
  );
};

const renderPlaces = (places) => {
  if (!placesList) return;
  setCurrentPlaces(places);
  const filtered = places.filter((place) => {
    if (currentPlaceFilter === "rated") return Number(place?.rating || 0) >= 4;
    if (currentPlaceFilter === "withImage") return Boolean(place?.image);
    return true;
  });
  if (!filtered.length) {
    placesList.innerHTML = '<div class="place-card">No places found.</div>';
    return;
  }
  const reviews = getPlaceReviews();
  const enableWiki = activePlacesKind === "famous";
  placesList.innerHTML = filtered
    .map(
      (place) => {
        const key = buildPlaceKey(place);
        const wikiQuery = enableWiki ? String(place.name || "").trim() : "";
        const saved = reviews[key];
        return `
        <div class="place-card" data-place-name="${place.name || ""}" data-place-address="${place.address || ""}" data-place-id="${place.placeId || ""}" data-place-key="${key}" data-wiki-query="${wikiQuery}">
          ${
            place.image
              ? `<img class="place-thumb" src="${place.image}" alt="${place.name}" loading="lazy" />`
              : `<div class="place-thumb"></div>`
          }
          <div class="place-info">
            <strong>${place.name}</strong>
            <span>${place.address || ""}</span>
            <span>Rating: ${place.rating ? `${place.rating}/5` : "N/A"}</span>
            <div class="place-actions">
              <span>Your rating: ${
                saved?.rating
                  ? `${saved.rating}/5`
                  : "-"
              }</span>
              <button class="place-review-btn" type="button" data-place-review-btn>Review</button>
            </div>
          </div>
        </div>
      `;
      }
    )
    .join("");
};

const renderGems = (places) => {
  if (!gemsList) return;
  const list = (Array.isArray(places) ? places : []).slice(0, 3);
  if (!list.length) {
    gemsList.innerHTML = '<div class="place-card">No hidden gems found.</div>';
    return;
  }
  gemsList.innerHTML = list
    .map((place) => {
      const name = escapeHtml(place?.name || "Unknown");
      const address = escapeHtml(place?.address || "");
      const rating = place?.rating ? `${place.rating}/5` : "N/A";
      const image = place?.image ? escapeHtml(place.image) : "";
      return `
        <div class="place-card">
          ${
            image
              ? `<img class="place-thumb" src="${image}" alt="${name}" loading="lazy" />`
              : `<div class="place-thumb"></div>`
          }
          <div class="place-info">
            <strong>${name}</strong>
            <span>${address}</span>
            <span>Rating: ${rating}</span>
          </div>
        </div>
      `;
    })
    .join("");
};

const renderAiPlan = (plan) => {
  if (!aiPlanOutput) return;
  if (!plan) {
    aiPlanOutput.innerHTML = "<p>Plan unavailable.</p>";
    return;
  }
  const title = escapeHtml(plan.title || "Trip Plan");
  const summary = escapeHtml(plan.summary || "");
  const tips = Array.isArray(plan.tips) ? plan.tips : [];
  const itinerary = Array.isArray(plan.itinerary) ? plan.itinerary : [];

  aiPlanOutput.innerHTML = `
    <div class="ai-day">
      <h4>${title}</h4>
      ${summary ? `<p class="cost-meta">${summary}</p>` : ""}
    </div>
    ${itinerary
      .map((day) => {
        const dayTitle = escapeHtml(day?.title || `Day ${day?.day || ""}`);
        const blocks = Array.isArray(day?.blocks) ? day.blocks : [];
        return `
          <div class="ai-day">
            <h4>${dayTitle}</h4>
            <ul>
              ${blocks.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
            </ul>
          </div>
        `;
      })
      .join("")}
    ${
      tips.length
        ? `<div class="ai-day"><h4>Tips</h4><ul>${tips
            .map((tip) => `<li>${escapeHtml(tip)}</li>`)
            .join("")}</ul></div>`
        : ""
    }
  `;
};

const loadPlaces = async (kind) => {
  if (placesBox && !placesBox.classList.contains("is-hidden") && activePlacesKind === kind) {
    resetPlacesUI();
    return;
  }
  activePlacesKind = kind;
  const needsRouteCities = kind === "foodCorners";
  if ((needsRouteCities && (!currentFromCity || !currentCity)) || (!needsRouteCities && !currentCity)) {
    if (placesNote) placesNote.textContent = "Search a route first.";
    if (placesBox) placesBox.classList.remove("is-hidden");
    if (placesList) placesList.innerHTML = "";
    syncEssentialsEmptyState();
    return;
  }

  if (placesTitle) {
    placesTitle.textContent =
      kind === "hotels"
        ? "Hotels & Restaurants"
        : kind === "foodCorners"
        ? "Food Corners on Route"
        : "Famous Places";
  }

  if (placesNote) {
    placesNote.textContent =
      kind === "foodCorners"
        ? `From ${currentFromCity} to ${currentCity}`
        : `Near ${currentCity}`;
  }
  if (placesBox) placesBox.classList.remove("is-hidden");
  if (placesList) placesList.innerHTML = skeletonRows(4);
  syncEssentialsEmptyState();

  try {
    const endpoint =
      kind === "hotels" ? "hotels" : kind === "foodCorners" ? "food-corners" : "famous";
    const modeValue = String(currentRouteMode || currentMode || "").trim();
    const query =
      kind === "foodCorners"
        ? `from=${encodeURIComponent(currentFromCity)}&to=${encodeURIComponent(currentCity)}&mode=${encodeURIComponent(modeValue)}`
        : `city=${encodeURIComponent(currentCity)}${currentState ? `&state=${encodeURIComponent(currentState)}` : ""}`;
    const res = await fetch(
      `${apiBase}/api/explore/${endpoint}?${query}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
    const limit = 6;
    const basePlaces = (data.places || []).slice(0, limit);
    const withImages =
      kind === "foodCorners"
        ? basePlaces
        : await fillMissingPlaceImages(basePlaces, currentCity);
    renderPlaces(withImages);
    if (kind === "foodCorners" && placesNote && Number.isFinite(data?.route?.matrixDurationMin)) {
      placesNote.textContent = `From ${currentFromCity} to ${currentCity} - approx ${data.route.matrixDurationMin} min`;
    }
  } catch (error) {
    if (placesList)
      placesList.innerHTML = `Unable to load places: ${error.message}`;
  }
};

const loadHiddenGems = async (city) => {
  if (!gemsList) return;
  const targetCity = String(city || "").trim();
  if (!targetCity) {
    gemsList.innerHTML = '<div class="place-card">Enter a city to search.</div>';
    return;
  }
  if (gemsNote) {
    gemsNote.textContent = `Near ${targetCity}`;
  }
  gemsList.innerHTML = skeletonRows(3);
  if (gemsNoteInline) gemsNoteInline.textContent = "Searching...";

  try {
    const res = await fetch(
      `${apiBase}/api/explore/hidden-gems?city=${encodeURIComponent(targetCity)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
    const basePlaces = (data.places || []).slice(0, 3);
    const withImages = await fillMissingPlaceImages(basePlaces, targetCity);
    renderGems(withImages);
    if (gemsNoteInline) gemsNoteInline.textContent = "";
  } catch (error) {
    if (gemsList) gemsList.innerHTML = `Unable to load gems: ${error.message}`;
    if (gemsNoteInline) gemsNoteInline.textContent = "";
  }
};


if (hotelsBtn) {
  hotelsBtn.addEventListener("click", () => {
    setActiveAction(hotelsBtn);
    resetAiPlanUI();
    resetGemsUI();
    resetBudgetUI();
    resetSafetyUI();
    loadPlaces("hotels");
  });
}

if (foodCornersBtn) {
  foodCornersBtn.addEventListener("click", () => {
    setActiveAction(foodCornersBtn);
    resetAiPlanUI();
    resetGemsUI();
    resetBudgetUI();
    resetSafetyUI();
    loadPlaces("foodCorners");
  });
}

placeFilters.forEach((chip) => {
  chip.addEventListener("click", () => {
    currentPlaceFilter = chip.dataset.filter || "all";
    placeFilters.forEach((item) => {
      item.classList.toggle("is-active", item === chip);
    });
    renderPlaces(getCurrentPlaces());
  });
});

if (famousBtn) {
  famousBtn.addEventListener("click", () => {
    setActiveAction(famousBtn);
    resetAiPlanUI();
    resetGemsUI();
    resetBudgetUI();
    resetSafetyUI();
    loadPlaces("famous");
  });
}

if (aiPlanBtn) {
  aiPlanBtn.addEventListener("click", () => {
    const isOpen = aiPlanBox && !aiPlanBox.classList.contains("is-hidden");
    resetPlacesUI();
    setActiveAction(isOpen ? null : aiPlanBtn);
    setAiPlanVisibility(!isOpen);
  });
}

if (hiddenGemsBtn) {
  hiddenGemsBtn.addEventListener("click", () => {
    const isOpen = gemsBox && !gemsBox.classList.contains("is-hidden");
    resetPlacesUI();
    setActiveAction(isOpen ? null : hiddenGemsBtn);
    setGemsVisibility(!isOpen);
  });
}

if (budgetSplitterBtn) {
  budgetSplitterBtn.addEventListener("click", () => {
    const isOpen = budgetBox && !budgetBox.classList.contains("is-hidden");
    resetPlacesUI();
    setActiveAction(isOpen ? null : budgetSplitterBtn);
    setBudgetVisibility(!isOpen);
  });
}

if (safetyDashboardBtn) {
  safetyDashboardBtn.addEventListener("click", () => {
    const isOpen = safetyBox && !safetyBox.classList.contains("is-hidden");
    resetPlacesUI();
    setActiveAction(isOpen ? null : safetyDashboardBtn);
    setSafetyVisibility(!isOpen);
    if (!isOpen) {
      renderSafetyDashboard({ city: currentCity });
    }
  });
}

if (aiPlanForm) {
  aiPlanForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!aiPlanOutput) return;
    const formData = new FormData(aiPlanForm);
    const city = String(formData.get("city") || currentCity || "").trim();
    const days = formData.get("days");
    const budget = String(formData.get("budget") || "").trim();
    const pace = String(formData.get("pace") || "").trim();
    const interests = String(formData.get("interests") || "").trim();
    const fromCity = currentFromCity || "";

    if (!fromCity || !city) {
      if (aiPlanNote) aiPlanNote.textContent = "Search a route first.";
      return;
    }

    if (aiPlanNote) aiPlanNote.textContent = "Generating plan...";
    aiPlanOutput.innerHTML = skeletonRows(3);

    try {
      const res = await fetch(`${apiBase}/api/routes/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromCity,
          to: city,
          days,
          budget,
          pace,
          interests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      renderAiPlan(data?.plan);
      if (aiPlanNote) aiPlanNote.textContent = "";
    } catch (error) {
      if (aiPlanOutput) aiPlanOutput.innerHTML = `Unable to generate plan: ${error.message}`;
      if (aiPlanNote) aiPlanNote.textContent = "";
    }
  });
}

if (gemsForm) {
  gemsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(gemsForm);
    const city = String(formData.get("city") || currentCity || "").trim();
    if (!city) {
      if (gemsNoteInline) gemsNoteInline.textContent = "Enter a city.";
      return;
    }
    await loadHiddenGems(city);
  });
}

if (budgetForm) {
  budgetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(budgetForm);
    const totalBudget = Math.max(1000, Number(formData.get("totalBudget")) || 0);
    const travelers = Math.max(1, Number(formData.get("travelers")) || 1);
    const days = Math.max(1, Number(formData.get("days")) || 1);
    const contingencyPct = Math.max(0, Math.min(30, Number(formData.get("contingency")) || 0));
    const modeKey = String(currentRouteMode || currentMode || "Train").toLowerCase();

    const ratioMap = {
      train: { transport: 18, stay: 36, food: 22, activities: 16, emergency: 8 },
      bus: { transport: 20, stay: 34, food: 22, activities: 16, emergency: 8 },
      cab: { transport: 28, stay: 30, food: 20, activities: 14, emergency: 8 },
      flight: { transport: 35, stay: 27, food: 18, activities: 12, emergency: 8 },
    };
    const ratios = ratioMap[modeKey] || ratioMap.train;
    const contingencyAmount = Math.round((totalBudget * contingencyPct) / 100);
    const workingBudget = Math.max(0, totalBudget - contingencyAmount);

    const allocations = [
      { label: "Transport", amount: Math.round((workingBudget * ratios.transport) / 100) },
      { label: "Stay", amount: Math.round((workingBudget * ratios.stay) / 100) },
      { label: "Food", amount: Math.round((workingBudget * ratios.food) / 100) },
      { label: "Activities", amount: Math.round((workingBudget * ratios.activities) / 100) },
      { label: "Emergency reserve", amount: Math.round((workingBudget * ratios.emergency) / 100) },
    ];

    const perPerson = Math.round(totalBudget / travelers);
    const perPersonPerDay = Math.round(perPerson / days);

    if (budgetOutput) {
      budgetOutput.innerHTML = `
        <div class="budget-summary">
          <strong>Total: Rs ${totalBudget.toLocaleString("en-IN")}</strong><br />
          <span class="cost-meta">Per traveler: Rs ${perPerson.toLocaleString("en-IN")} | Per traveler/day: Rs ${perPersonPerDay.toLocaleString("en-IN")}</span><br />
          <span class="cost-meta">Contingency kept aside: Rs ${contingencyAmount.toLocaleString("en-IN")}</span>
        </div>
        ${allocations
          .map(
            (item) => `
              <div class="budget-line">
                <span>${item.label}</span>
                <strong>Rs ${item.amount.toLocaleString("en-IN")}</strong>
              </div>
            `
          )
          .join("")}
      `;
    }
    if (budgetNote) {
      budgetNote.textContent = `Smart split based on ${currentRouteMode || currentMode} mode and ${travelers} traveler(s).`;
    }
  });
}

if (placesList) {
  placesList.addEventListener("click", (event) => {
    const reviewBtn = event.target.closest("[data-place-review-btn]");
    const card = event.target.closest(".place-card");
    if (!card) return;
    if (reviewBtn) {
      const name = card.dataset.placeName || "";
      const key = card.dataset.placeKey || "";
      if (!key) return;
      activePlaceKey = key;
      if (placeReviewTitle) placeReviewTitle.textContent = `Review: ${name}`;
      const reviews = getPlaceReviews();
      const saved = reviews[key];
      setPlaceRating(Number(saved?.rating || 0));
      if (placeReviewInput) placeReviewInput.value = saved?.text || "";
      if (placeReviewBox) placeReviewBox.classList.remove("is-hidden");
      return;
    }
    const name = card.dataset.placeName || "";
    const address = card.dataset.placeAddress || "";
    const query = address || (name ? `${name} ${currentCity}` : "");
    if (query) updateMapToPlace(query);
    const wikiQuery = card.dataset.wikiQuery || "";
    if (wikiQuery) {
      const wikiUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
        wikiQuery
      )}`;
      window.open(wikiUrl, "_blank", "noopener,noreferrer");
    }
  });
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.mode || currentMode;
    const isSameMode = nextMode === currentMode;
    currentMode = nextMode;
    modeButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn === button);
    });
    setJourneyStats({ mode: currentMode });
    currentRouteMode = currentMode;
    if (currentFromCity && currentCity) {
      loadRoute(currentFromCity, currentCity, currentMode);
    }
    if (currentMode === "Train") {
      if (isSameMode && isTrainOpen) {
        setTrainOpen(false);
      } else {
        setTrainOpen(true);
        setBusOpen(false);
        setCabOpen(false);
        loadTrains(currentFromCity, currentCity);
      }
    } else if (currentMode === "Bus") {
      if (isSameMode && isBusOpen) {
        setBusOpen(false);
      } else {
        setTrainOpen(false);
        setBusOpen(true);
        setCabOpen(false);
        loadBusDetails(currentFromCity, currentCity);
      }
    } else if (currentMode === "Cab") {
      if (isSameMode && isCabOpen) {
        setCabOpen(false);
      } else {
        setTrainOpen(false);
        setBusOpen(false);
        setCabOpen(true);
        loadCabDetails(currentFromCity, currentCity);
      }
    } else if (trainBody) {
      setTrainOpen(false);
      setBusOpen(false);
      setCabOpen(false);
    }
  });
});

if (routeForm) {
  routeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireLogin()) return;
    const formData = new FormData(routeForm);
    const from = String(formData.get("from") || "").trim();
    const to = String(formData.get("to") || "").trim();
    if (!from || !to) return;
    resetPlacesUI();
    loadRoute(from, to, currentMode);
  });
}

const params = new URLSearchParams(window.location.search);
const fromParam = (params.get("from") || "").trim();
const toParam = (params.get("to") || "").trim();
const modeParam = (params.get("mode") || "").trim();
const stateParam = (params.get("state") || "").trim();

if (toParam) {
  currentCity = toParam;
}
if (stateParam) {
  currentState = stateParam;
}

const lastRoute = localStorage.getItem("lastRoute") || "";
if (!currentCity && lastRoute.includes("\u2192")) {
  const parts = lastRoute.split("\u2192");
  fallbackCity = (parts[1] || "").trim();
  if (fallbackCity) currentCity = fallbackCity;
}

syncCityInputs();

if (!requireLogin()) {
  // redirect handled
} else if (fromParam && toParam) {
  loadRoute(fromParam, toParam, modeParam || currentMode);
}

if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    setActiveAction(shareBtn);
    if (!currentFromCity || !currentCity) {
      shareBtn.textContent = "Search a route first";
      setTimeout(() => {
        shareBtn.textContent = "Share this trip";
      }, 1200);
      return;
    }
    const url = updateShareLink(
      currentFromCity,
      currentCity,
      currentRouteMode || currentMode
    );
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const temp = document.createElement("textarea");
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
      }
      shareBtn.textContent = "Copied link!";
    } catch {
      shareBtn.textContent = "Copy failed";
    }
    setTimeout(() => {
      shareBtn.textContent = "Share this trip";
      setActiveAction(null);
    }, 1400);
  });
}

if (modeButtons[0]) {
  modeButtons.forEach((btn, index) => {
    btn.classList.toggle("is-active", index === 0);
  });
}
setJourneyStats({ mode: currentMode, duration: "--", weather: "--" });
syncEssentialsEmptyState();
renderSafetyDashboard({ city: currentCity });

if (revealCards.length) {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 }
    );
    revealCards.forEach((card) => observer.observe(card));
  } else {
    revealCards.forEach((card) => card.classList.add("is-visible"));
  }
}

async function loadExploreData() {
  if (!currentCity) return;
  try {
    const hotelsRes = await fetch(
      `${apiBase}/api/explore/hotels?city=${encodeURIComponent(currentCity)}`
    );
    const hotels = await hotelsRes.json();

    const famousRes = await fetch(
      `${apiBase}/api/explore/famous?city=${encodeURIComponent(currentCity)}`
    );
    const famous = await famousRes.json();

    console.log(hotels);
    console.log(famous);
  } catch (error) {
    console.error("Explore preload failed:", error);
  }
}


