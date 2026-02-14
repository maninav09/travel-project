const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("./user");
const Route = require("./route");

const router = express.Router();

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

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
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
      email: email.toLowerCase(),
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

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found. Please sign up." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password." });
    }

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

module.exports = router;
