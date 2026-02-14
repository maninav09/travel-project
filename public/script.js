const onReady = (fn) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
};

onReady(() => {
  const siteHeader = document.querySelector("[data-site-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const mainNav = document.querySelector("[data-main-nav]");
  const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));

  const userAvatar = document.querySelector("[data-user-avatar]");
  const userName = document.querySelector("[data-user-name]");
  const logoutBtn = document.querySelector("[data-logout]");
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
  const newsletterForm = document.querySelector("[data-newsletter-form]");
  const newsletterNote = document.querySelector("[data-newsletter-note]");
  const lastTripReviewsBox = document.querySelector("[data-last-trip-reviews]");
  const isLocalDevHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const apiBase =
    isLocalDevHost && window.location.port && window.location.port !== "5000"
      ? "http://127.0.0.1:5000"
      : "";
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

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userProfileImage");
      setUserState();
    });
  }

  setUserState();

  const updateHeaderState = () => {
    if (!siteHeader) return;
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      mainNav.classList.toggle("is-open");
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
    const safeIndex = ((index % heroSlidesLimit) + heroSlidesLimit) % heroSlidesLimit;
    slides.forEach((slide, i) =>
      slide.classList.toggle("is-active", i < heroSlidesLimit && i === safeIndex)
    );
    heroDots.forEach((dot, i) =>
      dot.classList.toggle("is-active", i < heroSlidesLimit && i === safeIndex)
    );
    heroIndex = safeIndex;
    syncHeroBackground(safeIndex);
  };

  const nextHero = () => {
    if (!heroSlidesLimit) return;
    setActiveHero((heroIndex + 1) % heroSlidesLimit);
  };

  const prevHero = () => {
    if (!heroSlidesLimit) return;
    setActiveHero((heroIndex - 1 + heroSlidesLimit) % heroSlidesLimit);
  };

  const startHero = () => {
    if (heroTimer) clearInterval(heroTimer);
    if (heroSlidesLimit > 1) heroTimer = setInterval(nextHero, 5000);
  };

  if (slides.length) {
    setupHeroThemeSlides();
    setActiveHero(0);
    startHero();
    if (heroPrev) heroPrev.addEventListener("click", () => { prevHero(); startHero(); });
    if (heroNext) heroNext.addEventListener("click", () => { nextHero(); startHero(); });
    heroDots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const idx = Number(dot.dataset.heroDot || 0);
        if (idx >= heroSlidesLimit) return;
        setActiveHero(idx);
        startHero();
      });
    });
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
        const endpoints = [`${apiBase}/api/newsletter`, "http://127.0.0.1:5000/api/newsletter"];
        let response = null;
        let data = null;
        let lastError = "Unable to subscribe.";

        for (const endpoint of endpoints) {
          try {
            response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
            });
            data = await response.json();
            if (response.ok) break;
            lastError = data?.error || data?.message || `Request failed (${response.status})`;
          } catch {
            // Try next endpoint.
          }
        }

        if (!response || !response.ok) {
          throw new Error(lastError);
        }
        setNewsletterNote(data?.message || "Subscribed successfully.");
        newsletterForm.reset();
      } catch (error) {
        setNewsletterNote(error.message || "Unable to subscribe.", true);
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

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

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
            <img src="img/travel1.jpg" alt="${alt}" data-trending-photo />
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

  const fetchAiDestinationSuggestions = async () => {
    const fromInput = homeForm ? homeForm.querySelector('input[name="from"]') : null;
    const toInput = homeForm ? homeForm.querySelector('input[name="to"]') : null;
    const from = String(fromInput?.value || "").trim();
    const to = String(toInput?.value || "").trim();
    const history = getTripHistory()
      .map((item) => String(item?.label || "").trim())
      .filter(Boolean)
      .slice(0, 5);
    try {
      const response = await fetch(`${apiBase}/api/destinations/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, history }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data?.suggestions) && data.suggestions.length) {
        destinationSuggestions = data.suggestions.slice(0, 4);
      }
    } catch {
      // Keep defaults on network error.
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
    const cards =
      Array.isArray(destinationSuggestions) && destinationSuggestions.length
        ? destinationSuggestions
        : defaultDestinationSuggestions;
    cards.forEach((item) => {
      const badges = (item.badges || []).map((b) => `<span class="badge">${b}</span>`).join("");
      const card = document.createElement("button");
      card.type = "button";
      card.className = "suggestion-card";
      card.innerHTML = `
        <div class="badge-row">${badges}</div>
        <h3>${item.city}</h3>
        <p>${item.tagline}</p>
        <div class="suggestion-meta">${item.state} | Best by ${item.mode}</div>
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
      fetchPexelsImage({ query: item.pexelsQuery }).then((image) => {
        if (image) {
          card.style.setProperty("--card-image", `url("${image}")`);
        }
      });
    });
  };

  renderTrendingCards();
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
      window.open(buildWikipediaUrl(city, state), "_blank", "noopener,noreferrer");
    });
  }

  const openSuggestions = async () => {
    if (suggestionsModal) suggestionsModal.classList.remove("is-hidden");
    if (suggestionsGrid) {
      suggestionsGrid.innerHTML = `<p class="suggestions-loading">Loading AI destination suggestions...</p>`;
    }
    await fetchAiDestinationSuggestions();
    renderSuggestions();
  };

  const closeSuggestions = () => {
    if (suggestionsModal) suggestionsModal.classList.add("is-hidden");
  };

  if (exploreBtn) exploreBtn.addEventListener("click", openSuggestions);
  if (closeSuggestionsBtn) closeSuggestionsBtn.addEventListener("click", closeSuggestions);
  if (suggestionsModal) {
    suggestionsModal.addEventListener("click", (event) => {
      if (event.target === suggestionsModal) closeSuggestions();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSuggestions();
  });

  if (homeForm) {
    homeForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (!isLoggedIn) {
        if (loginNote) loginNote.textContent = "Please sign in to search routes.";
        window.location.href = "login.html";
        return;
      }

      const formData = new FormData(homeForm);
      const from = String(formData.get("from") || "").trim();
      const to = String(formData.get("to") || "").trim();
      const query = new URLSearchParams({ mode: homeMode, from, to }).toString();

      if (loginNote) loginNote.textContent = "Checking travel time...";
      if (homeCostBody) homeCostBody.textContent = "Loading cost comparison...";
      showContinueButton(false);

      try {
        const response = await fetch(
          `${apiBase}/api/routes?mode=${encodeURIComponent(homeMode)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );
        const data = await response.json();
        if (data.routes && data.routes.length) {
          const route = data.routes[0];
          const durations = ensureDurationsByMode(route.durationByMode || {}, route, homeMode);
          renderHomeCostComparison(durations);
          localStorage.setItem("lastRoute", `${from} -> ${to}`);
          await addSearchedDestinationToTrending(to);
          pendingRouteQuery = query;
          if (loginNote) loginNote.textContent = "Cost comparison ready. Continue when you are ready.";
          showContinueButton(true);
        } else {
          if (loginNote) loginNote.textContent = "No time data found.";
          if (homeCostBody) homeCostBody.textContent = "Cost comparison will appear once durations are available.";
          showContinueButton(false);
        }
      } catch {
        if (loginNote) loginNote.textContent = "Unable to load data. Check server.";
        if (homeCostBody) homeCostBody.textContent = "Unable to load cost comparison.";
        showContinueButton(false);
      }
    });
  }
});

