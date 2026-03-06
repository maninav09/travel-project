const express = require("express");
const crypto = require("crypto");
const User = require("./user");
const Itinerary = require("./itinerary");

const router = express.Router();
const USE_MONGO = process.env.USE_MONGO === "true";
const APP_BASE_URL = (process.env.APP_BASE_URL || "").trim();

const profileMemory = new Map();
const itineraryMemory = new Map();

const cleanEmail = (value) => String(value || "").trim().toLowerCase();
const cleanText = (value) => String(value || "").trim();
const clampInt = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
};

const sanitizePreferences = (prefs = {}) => {
  const interests = Array.isArray(prefs.interests)
    ? prefs.interests.map(cleanText).filter(Boolean).slice(0, 8)
    : String(prefs.interests || "")
        .split(",")
        .map(cleanText)
        .filter(Boolean)
        .slice(0, 8);
  const channels = Array.isArray(prefs.notifications)
    ? prefs.notifications.map(cleanText).filter(Boolean).slice(0, 4)
    : [];
  return {
    budget: ["budget", "mid-range", "premium"].includes(cleanText(prefs.budget))
      ? cleanText(prefs.budget)
      : "mid-range",
    pace: ["relaxed", "balanced", "packed"].includes(cleanText(prefs.pace))
      ? cleanText(prefs.pace)
      : "balanced",
    interests,
    notifications: channels.length ? channels : ["email"],
    updatedAt: new Date().toISOString(),
  };
};

const buildShareUrl = (shareCode, req) => {
  const origin =
    APP_BASE_URL ||
    `${req.protocol}://${req.get("host")}`.replace(/\/+$/, "");
  return `${origin}/route.html?itinerary=${encodeURIComponent(shareCode)}`;
};

router.get("/profile/:email", async (req, res) => {
  try {
    const email = cleanEmail(req.params.email);
    if (!email) return res.status(400).json({ error: "email is required" });

    if (!USE_MONGO) {
      const fallback = profileMemory.get(email) || {};
      return res.json({
        profile: {
          email,
          name: fallback.name || "",
          profileImage: fallback.profileImage || "",
          preferences: fallback.preferences || sanitizePreferences({}),
        },
      });
    }

    let user = null;
    try {
      user = await User.findOne({ email }).lean();
    } catch (dbError) {
      const fallback = profileMemory.get(email) || {};
      return res.json({
        profile: {
          email,
          name: fallback.name || "",
          profileImage: fallback.profileImage || "",
          preferences: fallback.preferences || sanitizePreferences({}),
        },
        fallback: true,
      });
    }
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      profile: {
        email: user.email,
        name: user.name || "",
        profileImage: user.profileImage || "",
        preferences: user.preferences || sanitizePreferences({}),
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ error: "Unable to fetch profile" });
  }
});

router.put("/profile/preferences", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: "email is required" });
    const preferences = sanitizePreferences(req.body?.preferences || {});

    if (!USE_MONGO) {
      const current = profileMemory.get(email) || {};
      profileMemory.set(email, { ...current, preferences });
      return res.json({ ok: true, preferences });
    }
    try {
      const user = await User.findOneAndUpdate(
        { email },
        { $set: { preferences } },
        { new: true }
      ).lean();
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ ok: true, preferences: user.preferences || preferences });
    } catch {
      const current = profileMemory.get(email) || {};
      profileMemory.set(email, { ...current, preferences });
      return res.json({ ok: true, preferences, fallback: true });
    }
  } catch (error) {
    console.error("Profile preferences update error:", error);
    return res.status(500).json({ error: "Unable to update preferences" });
  }
});

router.post("/bookings/itinerary", async (req, res) => {
  try {
    const userEmail = cleanEmail(req.body?.userEmail);
    const from = cleanText(req.body?.from);
    const to = cleanText(req.body?.to);
    const mode = cleanText(req.body?.mode) || "Train";
    const days = clampInt(req.body?.days || 3, 1, 30);
    const budget = cleanText(req.body?.budget) || "mid-range";
    const notes = cleanText(req.body?.notes).slice(0, 1000);

    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    const shareCode = crypto.randomBytes(6).toString("hex");
    const payload = { shareCode, userEmail, from, to, mode, days, budget, notes };

    if (USE_MONGO) {
      try {
        await Itinerary.create(payload);
      } catch {
        itineraryMemory.set(shareCode, { ...payload, createdAt: new Date().toISOString() });
      }
    } else {
      itineraryMemory.set(shareCode, { ...payload, createdAt: new Date().toISOString() });
    }

    return res.status(201).json({
      message: "Itinerary saved",
      shareCode,
      shareUrl: buildShareUrl(shareCode, req),
      itinerary: payload,
    });
  } catch (error) {
    console.error("Itinerary save error:", error);
    return res.status(500).json({ error: "Unable to save itinerary" });
  }
});

router.get("/bookings/itinerary/:shareCode", async (req, res) => {
  try {
    const shareCode = cleanText(req.params.shareCode).toLowerCase();
    if (!shareCode) return res.status(400).json({ error: "shareCode is required" });

    let itinerary = null;
    if (USE_MONGO) {
      try {
        itinerary = await Itinerary.findOne({ shareCode }).lean();
      } catch {
        itinerary = itineraryMemory.get(shareCode) || null;
      }
    } else {
      itinerary = itineraryMemory.get(shareCode) || null;
    }
    if (!itinerary) return res.status(404).json({ error: "Itinerary not found" });
    return res.json({ itinerary, shareUrl: buildShareUrl(shareCode, req) });
  } catch (error) {
    console.error("Itinerary fetch error:", error);
    return res.status(500).json({ error: "Unable to fetch itinerary" });
  }
});

router.get("/bookings/itinerary/:shareCode/export", async (req, res) => {
  try {
    const shareCode = cleanText(req.params.shareCode).toLowerCase();
    if (!shareCode) return res.status(400).json({ error: "shareCode is required" });

    let itinerary = null;
    if (USE_MONGO) {
      try {
        itinerary = await Itinerary.findOne({ shareCode }).lean();
      } catch {
        itinerary = itineraryMemory.get(shareCode) || null;
      }
    } else {
      itinerary = itineraryMemory.get(shareCode) || null;
    }
    if (!itinerary) return res.status(404).json({ error: "Itinerary not found" });

    const lines = [
      "Route-Connect Itinerary",
      "=======================",
      `From: ${itinerary.from}`,
      `To: ${itinerary.to}`,
      `Mode: ${itinerary.mode || "Train"}`,
      `Days: ${itinerary.days || 3}`,
      `Budget: ${itinerary.budget || "mid-range"}`,
      itinerary.notes ? `Notes: ${itinerary.notes}` : "",
      `Share URL: ${buildShareUrl(shareCode, req)}`,
    ].filter(Boolean);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="itinerary-${shareCode}.txt"`
    );
    return res.send(`${lines.join("\n")}\n`);
  } catch (error) {
    console.error("Itinerary export error:", error);
    return res.status(500).json({ error: "Unable to export itinerary" });
  }
});

router.post("/notifications/route-alerts", (req, res) => {
  const to = cleanText(req.body?.to) || "your destination";
  const weather = cleanText(req.body?.weather) || "mixed conditions";
  const mode = cleanText(req.body?.mode) || "Train";
  const duration = cleanText(req.body?.duration) || "unknown";
  const alerts = [
    `Weather in ${to}: ${weather}. Keep essentials packed.`,
    `Current selected mode: ${mode} (ETA: ${duration}).`,
    "Enable app notifications for live route and safety updates.",
  ];
  return res.json({ alerts, at: new Date().toISOString() });
});

module.exports = router;
