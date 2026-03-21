// Purpose: stores user account details and saved travel preferences.
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    profileImage: { type: String, default: "" },
    preferences: {
      budget: { type: String, default: "mid-range" },
      pace: { type: String, default: "balanced" },
      interests: { type: [String], default: [] },
      notifications: { type: [String], default: ["email"] },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
