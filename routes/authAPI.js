// Purpose: handles signup, signin, password reset, and profile image uploads.
const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/user");
const Route = require("../models/route");

const router = express.Router();
const signinAttempts = new Map();
const resetTokens = new Map();
const SIGNIN_MAX_ATTEMPTS = 6;
const SIGNIN_WINDOW_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 20 * 60 * 1000;

const cleanEmail = (value) => String(value || "").trim().toLowerCase();
const isStrongPassword = (password) => {
  const text = String(password || "");
  return (
    text.length >= 8 &&
    /[A-Z]/.test(text) &&
    /[a-z]/.test(text) &&
    /\d/.test(text) &&
    /[^A-Za-z0-9]/.test(text)
  );
};

const attemptKeyFor = (email, req) => {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  return `${cleanEmail(email)}::${ip}`;
};

const isSigninLocked = (key) => {
  const row = signinAttempts.get(key);
  if (!row) return false;
  if (Date.now() > row.resetAt) {
    signinAttempts.delete(key);
    return false;
  }
  return row.count >= SIGNIN_MAX_ATTEMPTS;
};

const trackSigninFailure = (key) => {
  const now = Date.now();
  const row = signinAttempts.get(key);
  if (!row || now > row.resetAt) {
    signinAttempts.set(key, { count: 1, resetAt: now + SIGNIN_WINDOW_MS });
    return;
  }
  row.count += 1;
  signinAttempts.set(key, row);
};

const clearSigninAttempts = (key) => {
  signinAttempts.delete(key);
};

const uploadDir = path.join(__dirname, "../../public/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

/* SIGNUP */
router.post("/signup", (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Invalid upload" });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = cleanEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Use at least 8 characters with uppercase, lowercase, number, and special character.",
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    let imageUrl = "";

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (typeof req.body.profileImage === "string") {
      imageUrl = req.body.profileImage.trim();
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: name || "",
      email: normalizedEmail,
      passwordHash,
      profileImage: imageUrl,
    });

    return res.status(201).json({
      message: "Signup successful",
      email,
      profileImage: imageUrl,
      name
    });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Signup failed" });
  }
});

/* SIGNIN */
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = cleanEmail(email);
    const attemptKey = attemptKeyFor(normalizedEmail, req);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (isSigninLocked(attemptKey)) {
      return res.status(429).json({
        error: "Too many sign-in attempts. Please retry in 15 minutes.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      trackSigninFailure(attemptKey);
      return res.status(404).json({ error: "User not found. Please sign up." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      trackSigninFailure(attemptKey);
      return res.status(401).json({ error: "Incorrect password." });
    }
    clearSigninAttempts(attemptKey);

    const routes = await Route.find({ userEmail: user.email })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      message: "Signin successful",
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      routes
    });

  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ error: "Signin failed" });
  }
});

router.post("/password/request-reset", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: "email is required" });

    let user = null;
    try {
      user = await User.findOne({ email }).lean();
    } catch {
      user = { email };
    }
    if (!user) {
      return res.json({
        ok: true,
        message: "If this email exists, reset steps have been prepared.",
      });
    }

    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    resetTokens.set(email, { token, expiresAt: Date.now() + RESET_TOKEN_TTL_MS });
    return res.json({
      ok: true,
      message: "Reset token generated for development use.",
      resetToken: token,
      expiresInMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.json({
      ok: true,
      message: "If this email exists, reset steps have been prepared.",
    });
  }
});

router.post("/password/reset", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "email, token, and newPassword are required" });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error:
          "Use at least 8 characters with uppercase, lowercase, number, and special character.",
      });
    }

    const row = resetTokens.get(email);
    if (!row || row.token !== token || Date.now() > row.expiresAt) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { passwordHash } },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    resetTokens.delete(email);
    return res.json({ ok: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Unable to reset password" });
  }
});

module.exports = router;
