/* Purpose: powers interactions and API calls for the landing page experience. */
const onReady = (fn) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
};

onReady(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  const siteHeader = document.querySelector("[data-site-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const mainNav = document.querySelector("[data-main-nav]");
  const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));

  const userAvatar = document.querySelector("[data-user-avatar]");
  const userName = document.querySelector("[data-user-name]");
  const userChip = document.querySelector("[data-user-chip]");
  const userAvatarTrigger = document.querySelector("[data-user-avatar-trigger]");
  const userTrigger = document.querySelector("[data-user-trigger]");
  const userMenu = document.querySelector("[data-user-menu]");
  const logoutBtn = document.querySelector("[data-logout]");
  const lightbox = document.querySelector("[data-image-lightbox]");
  const lightboxImg = document.querySelector("[data-lightbox-img]");
  const lightboxClose = document.querySelector("[data-lightbox-close]");
  const greetingLine = document.querySelector("[data-user-greeting]");

  const slides = Array.from(document.querySelectorAll("[data-hero-slide]"));
  const heroDots = Array.from(document.querySelectorAll("[data-hero-dot]"));
  const heroPrev = document.querySelector("[data-hero-prev]");
  const heroNext = document.querySelector("[data-hero-next]");
  const heroMedia = document.querySelector(".hero-media");
  let heroIndex = 0;
  let heroTimer = null;
  const heroThemeSlides = [
    {
      label: "Traditional",
      title: "Traditional Indian Heritage Streets",
      city: "Jaipur",
      query: "Jaipur traditional architecture india",
    },
    {
      label: "Religious Place",
      title: "Sacred Ghats and Temple Rituals",
      city: "Varanasi",
      query: "Varanasi temple ghat india",
    },
    {
      label: "Indian Tourist",
      title: "Classic Tourist Landmarks in India",
      city: "Agra",
      query: "Agra Taj Mahal indian tourist city",
    },
    {
      label: "Famous City",
      title: "Famous Indian City Skylines and Life",
      city: "Mumbai",
      query: "Mumbai famous city india skyline",
    },
  ];
  const heroSlidesLimit =
    slides.length && heroDots.length ? Math.min(4, slides.length, heroDots.length) : 0;

  const exploreBtn = document.querySelector("[data-explore]");
  const trendingGrid = document.querySelector("[data-trending-grid]");
  const suggestionsModal = document.querySelector("[data-suggestions]");
  const closeSuggestionsBtn = document.querySelector("[data-close-suggestions]");
  const suggestionsGrid = document.querySelector("[data-suggestions-grid]");

  const homeForm = document.querySelector("[data-home-route]");
  const loginNote = document.querySelector("[data-login-note]");
  const homeCostBody = document.querySelector("[data-home-cost-body]");
  const continueBtn = document.querySelector("[data-continue-route]");
  const savedRoutesList = document.querySelector("[data-saved-routes]");
  const newsletterForm = document.querySelector("[data-newsletter-form]");
  const newsletterNote = document.querySelector("[data-newsletter-note]");
  const lastTripReviewsBox = document.querySelector("[data-last-trip-reviews]");
  const apiBase = "";
  const apiEnabled = window.location.protocol !== "file:";
  const homeLogic = window.HomeLogic || {
    normalizeHeroIndex: (index, total) => {
      const max = Number(total) || 0;
      if (max <= 0) return 0;
      const value = Number(index) || 0;
      return ((value % max) + max) % max;
    },
    nextHeroIndex: (current, total) => {
      const value = Number(current) || 0;
      return ((value + 1) % total + total) % total;
    },
    prevHeroIndex: (current, total) => {
      const value = Number(current) || 0;
      return ((value - 1) % total + total) % total;
    },
    validateRouteInputs: (from, to) => {
      const cleanFrom = String(from || "").trim();
      const cleanTo = String(to || "").trim();
      if (cleanFrom.length < 2 || cleanTo.length < 2) {
        return {
          valid: false,
          message: "Please enter valid city names (minimum 2 characters).",
        };
      }
      if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
        return {
          valid: false,
          message: "Departure and destination cannot be the same city.",
        };
      }
      return { valid: true, message: "" };
    },
  };
  const savedRoutesKey = "homeSavedRoutes";
  const analyticsEndpoint = `${apiBase}/api/analytics`;
  let pendingRouteQuery = "";
  let homeMode = "Train";

  const setUserState = () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const name = localStorage.getItem("userName") || "Guest";
    const profileImage = localStorage.getItem("userProfileImage") || "";
    const lastRoute = localStorage.getItem("lastRoute") || "";

    if (userName) userName.textContent = isLoggedIn ? name || "Traveler" : "Guest";
    if (userAvatar) {
      userAvatar.src = isLoggedIn && profileImage ? profileImage : "img/travel1.jpg";
    }
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
    if (userChip) userChip.classList.toggle("is-logged-in", isLoggedIn);
    if (greetingLine) {
      greetingLine.textContent = isLoggedIn
        ? `Welcome back, ${name || "Traveler"}${lastRoute ? ` - Last route: ${lastRoute}` : ""}`
        : "Welcome, Guest - Sign in to unlock saved routes";
    }
  };

  if (userAvatar) {
    userAvatar.addEventListener("error", () => {
      userAvatar.src = "img/travel1.jpg";
    });
  }

  if (userAvatarTrigger) {
    userAvatarTrigger.addEventListener("click", () => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      const avatarSrc = String(userAvatar?.src || "").trim();
      if (!isLoggedIn) {
        window.location.href = "login.html";
        return;
      }
      if (!lightbox || !lightboxImg || !avatarSrc) return;
      lightboxImg.src = avatarSrc;
      lightbox.classList.remove("is-hidden");
    });
  }

  const closeUserMenu = () => {
    if (!userChip || !userTrigger) return;
    userChip.classList.remove("is-open");
    userTrigger.setAttribute("aria-expanded", "false");
  };

  if (userTrigger) {
    userTrigger.addEventListener("click", () => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (!isLoggedIn) {
        window.location.href = "login.html";
        return;
      }
      const willOpen = !userChip?.classList.contains("is-open");
      if (userChip) userChip.classList.toggle("is-open", willOpen);
      userTrigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  }

  if (lightbox && lightboxClose) {
    lightboxClose.addEventListener("click", () => {
      lightbox.classList.add("is-hidden");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userProfileImage");
      setUserState();
      closeUserMenu();
    });
  }

  setUserState();

  const syncUserPreferences = async () => {
    if (!apiEnabled) return;
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userEmail = String(localStorage.getItem("userEmail") || "").trim().toLowerCase();
    if (!isLoggedIn || !userEmail) return;
    const storedInterests =
      localStorage
        .getItem("preferredInterests")
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean) || [];
    const preferences = {
      budget: localStorage.getItem("preferredBudget") || "mid-range",
      pace: localStorage.getItem("preferredPace") || "balanced",
      interests: storedInterests,
      notifications: ["email", "in-app"],
    };
    try {
      await fetch(`${apiBase}/api/enhancements/profile/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, preferences }),
      });
    } catch {
      // keep local behavior if profile sync fails
    }
  };
  syncUserPreferences();

  const updateHeaderState = () => {
    if (!siteHeader) return;
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });

  if (navToggle && mainNav) {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mainNav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const syncHeroBackground = (index) => {
    if (!heroMedia) return;
    const img = slides[index]?.querySelector("img");
    const src = img?.currentSrc || img?.src || "";
    if (src) {
      heroMedia.style.setProperty("--hero-bg-image", `url("${src}")`);
    }
  };

  const setupHeroThemeSlides = () => {
    if (!slides.length) return;
    slides.forEach((slide, i) => {
      const inUse = i < heroSlidesLimit;
      slide.classList.toggle("is-hidden", !inUse);
      if (!inUse) return;
      const theme = heroThemeSlides[i] || heroThemeSlides[0];
      const copy = slide.querySelector(".hero-slide-copy");
      const img = slide.querySelector("img");
      if (copy) {
        copy.innerHTML = `
          <p>${theme.label}</p>
          <h2>${theme.title}</h2>
        `;
      }
      if (img) {
        img.alt = `${theme.city} ${theme.label}`;
      }
    });
    heroDots.forEach((dot, i) => {
      dot.classList.toggle("is-hidden", i >= heroSlidesLimit);
    });
  };

  const setActiveHero = (index) => {
    if (!heroSlidesLimit) return;
    const safeIndex = homeLogic.normalizeHeroIndex(index, heroSlidesLimit);
    slides.forEach((slide, i) =>
      slide.classList.toggle("is-active", i < heroSlidesLimit && i === safeIndex)
    );
    heroDots.forEach((dot, i) => {
      const active = i < heroSlidesLimit && i === safeIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
    heroIndex = safeIndex;
    syncHeroBackground(safeIndex);
  };

  const nextHero = () => {
    if (!heroSlidesLimit) return;
    setActiveHero(homeLogic.nextHeroIndex(heroIndex, heroSlidesLimit));
  };

  const prevHero = () => {
    if (!heroSlidesLimit) return;
    setActiveHero(homeLogic.prevHeroIndex(heroIndex, heroSlidesLimit));
  };

  const startHero = () => {
    if (heroTimer) clearInterval(heroTimer);
    if (heroSlidesLimit > 1) heroTimer = setInterval(nextHero, 5000);
  };

  if (slides.length) {
    setupHeroThemeSlides();
    setActiveHero(0);
    startHero();
    if (heroPrev)
      heroPrev.addEventListener("click", () => {
        prevHero();
        startHero();
      });
    if (heroNext)
      heroNext.addEventListener("click", () => {
        nextHero();
        startHero();
      });
    heroDots.forEach((dot) => {
      dot.setAttribute("aria-current", dot.classList.contains("is-active") ? "true" : "false");
      dot.addEventListener("click", () => {
        const idx = Number(dot.dataset.heroDot || 0);
        if (idx >= heroSlidesLimit) return;
        setActiveHero(idx);
        startHero();
      });
    });
    if (heroMedia) {
      heroMedia.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          prevHero();
          startHero();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          nextHero();
          startHero();
        }
      });
    }
  }

  if (revealItems.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );
    revealItems.forEach((item) => observer.observe(item));
  }

  const parseDurationToMinutes = (value) => {
    if (!value) return null;
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
    return total > 0 ? total : null;
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
    const hasAny = ["train", "bus", "cab"].some((mode) =>
      parseDurationToMinutes(durations?.[mode])
    );
    if (hasAny) return durations;
    const baseMinutes = parseDurationToMinutes(route?.duration);
    if (!baseMinutes) return durations;
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
    return { low: round10(low), high: round10(high) };
  };

  const formatCost = (range) => {
    if (!range) return "N/A";
    return `Rs ${range.low} - Rs ${range.high}`;
  };

  const renderHomeCostComparison = (durations = {}) => {
    if (!homeCostBody) return;
    const entries = [
      { mode: "train", label: "Train", duration: durations.train || "" },
      { mode: "bus", label: "Bus", duration: durations.bus || "" },
      { mode: "cab", label: "Cab", duration: durations.cab || "" },
    ];

    const enriched = entries.map((entry) => {
      const minutes = parseDurationToMinutes(entry.duration);
      const cost = estimateCostRange(entry.mode, minutes);
      const mid = cost ? (cost.low + cost.high) / 2 : null;
      return { ...entry, minutes, cost, mid };
    });

    const available = enriched.filter((e) => e.minutes && e.cost);
    if (!available.length) {
      homeCostBody.textContent = "Cost comparison will appear once durations are available.";
      return;
    }

    const cheapest = available.reduce((a, b) => (a.mid < b.mid ? a : b));
    const fastest = available.reduce((a, b) => (a.minutes < b.minutes ? a : b));

    homeCostBody.innerHTML =
      `<div class="cost-meta">Estimates in INR based on typical rates.</div>` +
      enriched
        .map((entry) => {
          const tags = [];
          if (entry.mode === cheapest.mode) tags.push("Cheapest");
          if (entry.mode === fastest.mode) tags.push("Fastest");
          const tagMarkup = tags.length
            ? `<span class="cost-tag">${tags.join(" / ")}</span>`
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
  };

  const setNewsletterNote = (text, isError = false) => {
    if (!newsletterNote) return;
    newsletterNote.textContent = text;
    newsletterNote.classList.toggle("is-error", isError);
  };

  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(newsletterForm);
      const email = String(formData.get("email") || "").trim();
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');
      if (!email) {
        setNewsletterNote("Please enter a valid email.", true);
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      setNewsletterNote("Subscribing...");
      try {
        const payload = JSON.stringify({ email, source: "index-footer" });
        const response = await fetch(`${apiBase}/api/newsletter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
        }
        const message = String(data?.message || "").trim();
        const warning = String(data?.warning || "").trim();
        const isAlreadySubscribed = /already subscribed/i.test(message);
        const isWarning = Boolean(warning) || data?.emailStatus === "failed";
        setNewsletterNote(
          message ||
            (isAlreadySubscribed
              ? "You are already subscribed. Welcome email sent again."
              : "Subscribed successfully."),
          isWarning
        );
        newsletterForm.reset();
        trackEvent("newsletter_subscribe", { status: "success" });
      } catch (error) {
        setNewsletterNote(error.message || "Unable to subscribe.", true);
        trackEvent("newsletter_subscribe", { status: "error" });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  const showContinueButton = (show) => {
    if (!continueBtn) return;
    continueBtn.classList.toggle("is-hidden", !show);
  };

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (!pendingRouteQuery) return;
      trackEvent("continue_route_click");
      window.location.href = `route.html?${pendingRouteQuery}`;
    });
  }

  const defaultDestinationSuggestions = [
    {
      city: "Jaipur",
      state: "Rajasthan",
      tagline: "Traditional forts, local crafts, and royal streets",
      mode: "Train",
      badges: ["Traditional", "Heritage"],
      pexelsQuery: "Jaipur traditional architecture india",
    },
    {
      city: "Varanasi",
      state: "Uttar Pradesh",
      tagline: "Religious ghats, temples, and timeless rituals",
      mode: "Train",
      badges: ["Religious Place", "Spiritual"],
      pexelsQuery: "Varanasi temple ghat india",
    },
    {
      city: "Agra",
      state: "Uttar Pradesh",
      tagline: "Classic Indian tourist landmarks and old-city charm",
      mode: "Cab",
      badges: ["Indian Tourist", "Monument"],
      pexelsQuery: "Agra Taj Mahal indian tourist city",
    },
    {
      city: "Mumbai",
      state: "Maharashtra",
      tagline: "Famous city skyline, sea views, and street life",
      mode: "Bus",
      badges: ["Famous City", "Urban"],
      pexelsQuery: "Mumbai famous city india skyline",
    },
  ];
  let destinationSuggestions = defaultDestinationSuggestions.slice();
  let lastSuggestionSignature = "";
  let lastSuggestionCities = [];
  let exploredSuggestionCities = [];
  let destinationSuggestionWarning = "";

  const trendingStorageKey = "trendingDestinations";
  const defaultTrending = [
    { city: "Leh", state: "Ladakh", label: "Adventure" },
    { city: "Varanasi", state: "Uttar Pradesh", label: "Spiritual" },
    { city: "Rishikesh", state: "Uttarakhand", label: "Nature" },
    { city: "Kochi", state: "Kerala", label: "Culture" },
  ];

  const buildWikipediaUrl = (city, state) => {
    const query = `${city} ${state} India`.trim();
    return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
  };

  const getStoredTrending = () => {
    try {
      const raw = localStorage.getItem(trendingStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveStoredTrending = (items) => {
    localStorage.setItem(trendingStorageKey, JSON.stringify(items));
  };

  const clearSavedDestinationState = () => {
    lastSuggestionSignature = "";
    lastSuggestionCities = [];
    destinationSuggestions = [];
    destinationSuggestionWarning = "";
    exploredSuggestionCities = [];
    saveStoredTrending([]);
    renderTrendingCards();
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const trackEvent = (event, metadata = {}) => {
    if (!apiEnabled) return;
    const payload = JSON.stringify({
      event,
      page: "home",
      metadata,
      ts: new Date().toISOString(),
    });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(analyticsEndpoint, blob);
        return;
      }
    } catch {
      // Fallback to fetch below.
    }
    fetch(analyticsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  };

  const getTripHistory = () => {
    try {
      const raw = localStorage.getItem("tripHistory");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getTripReviews = () => {
    try {
      const raw = localStorage.getItem("tripReviews");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const getSavedRoutes = () => {
    try {
      const raw = localStorage.getItem(savedRoutesKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveSavedRoutes = (items) => {
    localStorage.setItem(savedRoutesKey, JSON.stringify(items));
  };

  const upsertTripHistory = ({ from, to, mode }) => {
    const cleanFrom = String(from || "").trim();
    const cleanTo = String(to || "").trim();
    if (!cleanFrom || !cleanTo) return;
    const label = `${cleanFrom} \u2192 ${cleanTo}`;
    const history = getTripHistory().filter((item) => item?.label !== label);
    history.unshift({
      label,
      mode: mode || "Train",
      date: new Date().toLocaleDateString(),
    });
    localStorage.setItem("tripHistory", JSON.stringify(history.slice(0, 6)));
  };

  const renderSavedRoutes = () => {
    if (!savedRoutesList) return;
    const items = getSavedRoutes().slice(0, 6);
    if (!items.length) {
      savedRoutesList.innerHTML = `<article class="saved-route-card"><p>No saved routes yet. Search a route to create one.</p></article>`;
      return;
    }
    savedRoutesList.innerHTML = items
      .map((item, idx) => {
        const from = escapeHtml(item.from || "");
        const to = escapeHtml(item.to || "");
        const mode = escapeHtml(item.mode || "Train");
        const updated = escapeHtml(item.lastUsedAt || "");
        return `
          <article class="saved-route-card">
            <h3>${from} \u2192 ${to}</h3>
            <p>Mode: ${mode}</p>
            <small>Last used: ${updated || "Recently"}</small>
            <div class="saved-route-actions">
              <button class="primary-btn" type="button" data-use-saved-route="${idx}">Use route</button>
              <button class="ghost-btn" type="button" data-delete-saved-route="${idx}">Remove</button>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const saveRouteSearch = ({ from, to, mode }) => {
    const cleanFrom = String(from || "").trim();
    const cleanTo = String(to || "").trim();
    if (!cleanFrom || !cleanTo) return;
    const list = getSavedRoutes().filter(
      (item) =>
        String(item?.from || "").toLowerCase() !== cleanFrom.toLowerCase() ||
        String(item?.to || "").toLowerCase() !== cleanTo.toLowerCase()
    );
    list.unshift({
      from: cleanFrom,
      to: cleanTo,
      mode: mode || "Train",
      lastUsedAt: new Date().toLocaleString(),
    });
    saveSavedRoutes(list.slice(0, 6));
    renderSavedRoutes();
    upsertTripHistory({ from: cleanFrom, to: cleanTo, mode: mode || "Train" });
  };

  const renderStars = (rating) => {
    const n = Math.max(0, Math.min(5, Number(rating) || 0));
    return `${"*".repeat(n)}${"-".repeat(5 - n)}`;
  };

  const renderLastTripReviews = () => {
    if (!lastTripReviewsBox) return;
    const history = getTripHistory();
    const reviews = getTripReviews();
    const historyLabels = history.map((item) => item?.label).filter(Boolean);
    const reviewLabels = Object.keys(reviews).filter(
      (label) => reviews[label] && (reviews[label].text || reviews[label].rating)
    );
    const mergedLabels = [
      ...historyLabels,
      ...reviewLabels.filter((label) => !historyLabels.includes(label)),
    ];
    const latestThree = mergedLabels.slice(0, 3);
    if (!latestThree.length) return;

    lastTripReviewsBox.innerHTML = latestThree
      .map((label) => {
        const review = reviews[label] || {};
        const safeRoute = escapeHtml(label);
        const safeText = escapeHtml(review.text || "Trip was smooth and well planned.");
        const rating = Number(review.rating) || 0;
        const stars = renderStars(rating);
        return `
          <article class="quote">
            <p class="quote-route">${safeRoute}</p>
            <p class="quote-stars" aria-label="Rating ${rating}/5">${stars}</p>
            <p>"${safeText}"</p>
            <h4>${rating ? `${rating}/5` : "Unrated"}</h4>
          </article>
        `;
      })
      .join("");
  };

  const renderTrendingCards = () => {
    if (!trendingGrid) return;
    const stored = getStoredTrending();
    const merged = stored.length ? stored.slice(0, 4) : defaultTrending.slice(0, 4);

    trendingGrid.innerHTML = merged
      .map((item) => {
        const city = escapeHtml(item.city || "");
        const state = escapeHtml(item.state || "India");
        const label = escapeHtml(item.label || "Trending");
        const alt = escapeHtml(`${city} destination`);
        return `
          <article class="tile" data-city="${city}" data-state="${state}" data-label="${label}">
            <img src="img/travel1.jpg" alt="${alt}" data-trending-photo loading="lazy" decoding="async" />
            <div class="tile-copy">
              <span>${label}</span>
              <h3>${city}</h3>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const pexelsImageSessionCache = new Map();

  const fetchPexelsImage = async ({ city = "", query = "" } = {}) => {
    try {
      const cleanCity = String(city || "").trim();
      const cleanQuery = String(query || "").trim();
      if (!cleanCity && !cleanQuery) return "";
      const key = `${cleanCity}|${cleanQuery}`.toLowerCase();
      if (pexelsImageSessionCache.has(key)) {
        return pexelsImageSessionCache.get(key);
      }
      const params = new URLSearchParams();
      if (cleanCity) params.set("city", cleanCity);
      if (cleanQuery) params.set("query", cleanQuery);
      const response = await fetch(`${apiBase}/api/photos/pexels?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) return "";
      const data = await response.json();
      const image = typeof data?.image === "string" ? data.image : "";
      pexelsImageSessionCache.set(key, image);
      return image;
    } catch {
      return "";
    }
  };

  const applyLivePexelsImages = async () => {
    if (!trendingGrid) return;
    const tiles = Array.from(trendingGrid.querySelectorAll(".tile"));
    for (const tile of tiles) {
      const city = String(tile.dataset.city || "").trim();
      if (!city) continue;
      const img = tile.querySelector("[data-trending-photo]");
      if (!img) continue;
      const pexelsImage = await fetchPexelsImage({ city });
      if (!pexelsImage) continue;
      img.src = pexelsImage;
    }
  };

  const applyLiveHeroPexelsImages = async () => {
    if (!heroSlidesLimit) return;
    for (let i = 0; i < heroSlidesLimit; i += 1) {
      const slide = slides[i];
      const img = slide?.querySelector("img");
      const theme = heroThemeSlides[i] || heroThemeSlides[0];
      if (!slide || !img || !theme) continue;
      const image = await fetchPexelsImage({ query: theme.query });
      if (!image) continue;
      img.src = image;
      if (i === heroIndex) syncHeroBackground(i);
    }
  };

  const suggestionsSignature = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) => `${item.city}|${item.state}|${item.tagline}|${item.mode}`)
      .join("||");

  const fetchAiDestinationSuggestions = async () => {
    if (!apiEnabled) {
      destinationSuggestions = [];
      return;
    }
    const fromInput = homeForm ? homeForm.querySelector('input[name="from"]') : null;
    const toInput = homeForm ? homeForm.querySelector('input[name="to"]') : null;
    const from = String(fromInput?.value || "").trim();
    const to = String(toInput?.value || "").trim();
    const history = getTripHistory()
      .map((item) => String(item?.label || "").trim())
      .filter(Boolean)
      .slice(0, 5);
    try {
      const requestSuggestions = async () => {
        const response = await fetch(`${apiBase}/api/destinations/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            from,
            to,
            history,
            previousCities: Array.from(
              new Set([...(Array.isArray(lastSuggestionCities) ? lastSuggestionCities : []), ...exploredSuggestionCities])
            ).slice(0, 16),
            requireAi: true,
            nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }),
        });
        const data = await response.json();
        if (!response.ok) return { suggestions: [], warning: "" };
        return {
          suggestions: Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 4) : [],
          warning: String(data?.warning || "").trim(),
        };
      };

      let nextResult = await requestSuggestions();
      let nextSuggestions = nextResult.suggestions;
      let nextSignature = suggestionsSignature(nextSuggestions);
      if (nextSuggestions.length && nextSignature === lastSuggestionSignature) {
        const retryResult = await requestSuggestions();
        const retrySuggestions = retryResult.suggestions;
        const retrySignature = suggestionsSignature(retrySuggestions);
        if (retrySuggestions.length && retrySignature !== lastSuggestionSignature) {
          nextSuggestions = retrySuggestions;
          nextSignature = retrySignature;
          nextResult = retryResult;
        }
      }

      if (nextSuggestions.length) {
        destinationSuggestions = nextSuggestions;
        destinationSuggestionWarning = nextResult.warning;
        lastSuggestionSignature = nextSignature;
        lastSuggestionCities = nextSuggestions.map((item) => String(item.city || "").trim()).filter(Boolean);
        exploredSuggestionCities = Array.from(
          new Set([...exploredSuggestionCities, ...lastSuggestionCities])
        ).slice(-24);
      }
    } catch {
      destinationSuggestions = [];
      destinationSuggestionWarning = "";
    }
  };

  const addSearchedDestinationToTrending = async (city) => {
    const cleanCity = String(city || "").trim();
    if (!cleanCity) return;
    const current = getStoredTrending().filter(
      (item) => String(item.city || "").toLowerCase() !== cleanCity.toLowerCase()
    );
    current.unshift({
      city: cleanCity,
      state: "India",
      label: "Recent",
    });
    saveStoredTrending(current.slice(0, 4));
    renderTrendingCards();
    await applyLivePexelsImages();
  };

  const renderSuggestions = () => {
    if (!suggestionsGrid) return;
    suggestionsGrid.innerHTML = "";
    const cards = Array.isArray(destinationSuggestions) ? destinationSuggestions : [];
    if (!cards.length) {
      suggestionsGrid.innerHTML =
        `<p class="suggestions-loading">Unable to load fresh AI suggestions. Please try again.</p>`;
      return;
    }
    cards.forEach((item) => {
      const city = escapeHtml(item.city || "");
      const state = escapeHtml(item.state || "India");
      const mode = escapeHtml(item.mode || "Train");
      const tagline = escapeHtml(item.tagline || "");
      const image = escapeHtml(item.image || "");
      const badges = (item.badges || [])
        .map((b) => `<span class="badge">${escapeHtml(b)}</span>`)
        .join("");
      const touristPlaces = (Array.isArray(item.touristPlaces) ? item.touristPlaces : [])
        .slice(0, 3)
        .map((place) => `<li>${escapeHtml(place)}</li>`)
        .join("");
      const card = document.createElement("button");
      card.type = "button";
      card.className = "suggestion-card";
      card.innerHTML = `
        <div class="suggestion-image-wrap">
          <img class="suggestion-image" src="${image || "img/travel1.jpg"}" alt="${city} destination" loading="lazy" decoding="async" />
          <div class="badge-row">${badges}</div>
        </div>
        <div class="suggestion-copy">
          <h3>${city}</h3>
          <p>${tagline}</p>
          <div class="suggestion-meta">${state} | Best by ${mode}</div>
          <div class="suggestion-spots-title">Tourist Places</div>
          <ul class="suggestion-spots">${touristPlaces}</ul>
        </div>
      `;
      card.addEventListener("click", () => {
        const fromInput = homeForm ? homeForm.querySelector('input[name="from"]') : null;
        const toInput = homeForm ? homeForm.querySelector('input[name="to"]') : null;
        if (fromInput && !fromInput.value.trim()) fromInput.value = "New Delhi";
        if (toInput) toInput.value = item.city;
        homeMode = item.mode || homeMode;
        if (loginNote) loginNote.textContent = "";
        if (suggestionsModal) suggestionsModal.classList.add("is-hidden");
        if (toInput) toInput.focus();
      });
      suggestionsGrid.appendChild(card);
      const resolvedImage = String(item.image || "").trim();
      if (resolvedImage) {
        card.style.setProperty("--card-image", `url("${resolvedImage}")`);
      }
    });
  };

  renderTrendingCards();
  renderSavedRoutes();
  applyLiveHeroPexelsImages();
  applyLivePexelsImages();
  renderLastTripReviews();
  if (trendingGrid) {
    trendingGrid.addEventListener("click", (event) => {
      const tile = event.target.closest(".tile");
      if (!tile) return;
      const city = String(tile.dataset.city || "").trim();
      const state = String(tile.dataset.state || "India").trim();
      if (!city) return;
      trackEvent("trending_tile_click", { city, state });
      window.open(buildWikipediaUrl(city, state), "_blank", "noopener,noreferrer");
    });
  }

  if (savedRoutesList) {
    savedRoutesList.addEventListener("click", (event) => {
      const useBtn = event.target.closest("[data-use-saved-route]");
      const deleteBtn = event.target.closest("[data-delete-saved-route]");
      const items = getSavedRoutes();

      if (deleteBtn) {
        const idx = Number(deleteBtn.dataset.deleteSavedRoute);
        if (!Number.isFinite(idx)) return;
        const next = items.filter((_, i) => i !== idx);
        saveSavedRoutes(next);
        renderSavedRoutes();
        return;
      }

      if (useBtn) {
        const idx = Number(useBtn.dataset.useSavedRoute);
        const item = items[idx];
        if (!item || !homeForm) return;
        const fromInput = homeForm.querySelector('input[name="from"]');
        const toInput = homeForm.querySelector('input[name="to"]');
        if (fromInput) fromInput.value = item.from || "";
        if (toInput) toInput.value = item.to || "";
        homeMode = item.mode || "Train";
        trackEvent("saved_route_reuse", { from: item.from, to: item.to, mode: homeMode });
        homeForm.requestSubmit();
      }
    });
  }

  const openSuggestions = async () => {
    if (suggestionsModal) suggestionsModal.classList.remove("is-hidden");
    if (suggestionsGrid) {
      suggestionsGrid.innerHTML = `<p class="suggestions-loading">Loading AI destination suggestions...</p>`;
    }
    if (!apiEnabled) {
      if (suggestionsGrid) {
        suggestionsGrid.innerHTML =
          `<p class="suggestions-loading">Run this page through your Node server to load AI suggestions.</p>`;
      }
      return;
    }
    clearSavedDestinationState();
    await fetchAiDestinationSuggestions();
    if (!destinationSuggestions.length) {
      if (suggestionsGrid) {
        suggestionsGrid.innerHTML =
          `<p class="suggestions-loading">Unable to load AI suggestions right now. Please try again.</p>`;
      }
      return;
    }
    renderSuggestions();
  };

  const closeSuggestions = () => {
    if (suggestionsModal) suggestionsModal.classList.add("is-hidden");
  };

  if (exploreBtn)
    exploreBtn.addEventListener("click", () => {
      trackEvent("explore_click");
      openSuggestions();
    });
  if (closeSuggestionsBtn) closeSuggestionsBtn.addEventListener("click", closeSuggestions);
  if (suggestionsModal) {
    suggestionsModal.addEventListener("click", (event) => {
      if (event.target === suggestionsModal) closeSuggestions();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navToggle && mainNav && mainNav.classList.contains("is-open")) {
      mainNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
    if (event.key === "Escape") closeUserMenu();
    if (event.key === "Escape" && lightbox) lightbox.classList.add("is-hidden");
    if (event.key === "Escape") closeSuggestions();
  });

  document.addEventListener("click", (event) => {
    if (!userChip || !userChip.classList.contains("is-open")) return;
    if (userChip.contains(event.target)) return;
    closeUserMenu();
  });

  const fetchRouteComparison = async ({ from, to, mode }) => {
    const response = await fetch(
      `${apiBase}/api/routes?mode=${encodeURIComponent(mode)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    throw new Error(data?.error || `Request failed (${response.status})`);
  };

  const setInputValidationState = (input, hasError) => {
    if (!input) return;
    input.classList.toggle("is-invalid", Boolean(hasError));
    input.setAttribute("aria-invalid", hasError ? "true" : "false");
  };

  const runHomeRouteSearch = async ({ from, to, source = "form" }) => {
    const validation = homeLogic.validateRouteInputs(from, to);
    const fromInput = homeForm ? homeForm.querySelector('input[name="from"]') : null;
    const toInput = homeForm ? homeForm.querySelector('input[name="to"]') : null;

    if (!validation.valid) {
      if (loginNote) loginNote.textContent = validation.message;
      setInputValidationState(fromInput, true);
      setInputValidationState(toInput, true);
      showContinueButton(false);
      trackEvent("route_search_validation_error", { source, message: validation.message });
      return;
    }

    setInputValidationState(fromInput, false);
    setInputValidationState(toInput, false);

    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
      if (loginNote) loginNote.textContent = "Please sign in to search routes.";
      window.location.href = "login.html";
      return;
    }

    const query = new URLSearchParams({ mode: homeMode, from, to }).toString();

    if (loginNote) loginNote.textContent = "Checking travel time...";
    if (homeCostBody) homeCostBody.textContent = "Loading cost comparison...";
    showContinueButton(false);

    try {
      const data = await fetchRouteComparison({ from, to, mode: homeMode });
      if (data.routes && data.routes.length) {
        const route = data.routes[0];
        const durations = ensureDurationsByMode(route.durationByMode || {}, route, homeMode);
        renderHomeCostComparison(durations);
        localStorage.setItem("lastRoute", `${from} \u2192 ${to}`);
        saveRouteSearch({ from, to, mode: homeMode });
        setUserState();
        renderLastTripReviews();
        await addSearchedDestinationToTrending(to);
        pendingRouteQuery = query;
        if (loginNote) loginNote.textContent = "Cost comparison ready. Continue when you are ready.";
        showContinueButton(true);
        trackEvent("route_search", { source, status: "success", from, to, mode: homeMode });
      } else {
        if (loginNote) loginNote.textContent = "No time data found.";
        if (homeCostBody) homeCostBody.textContent = "Cost comparison will appear once durations are available.";
        showContinueButton(false);
        trackEvent("route_search", { source, status: "no_results", from, to, mode: homeMode });
      }
    } catch (error) {
      if (loginNote) loginNote.textContent = "Unable to load data. Check server.";
      if (homeCostBody) homeCostBody.textContent = "Unable to load cost comparison.";
      showContinueButton(false);
      trackEvent("route_search", { source, status: "error", from, to, mode: homeMode, error: error.message });
    }
  };

  if (homeForm) {
    const fromInput = homeForm.querySelector('input[name="from"]');
    const toInput = homeForm.querySelector('input[name="to"]');

    [fromInput, toInput].forEach((input) => {
      if (!input) return;
      input.addEventListener("input", () => {
        setInputValidationState(input, false);
      });
    });

    homeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(homeForm);
      const from = String(formData.get("from") || "").trim();
      const to = String(formData.get("to") || "").trim();
      await runHomeRouteSearch({ from, to, source: "form" });
    });
  }
});

