const mongoose = require("mongoose");

const itinerarySchema = new mongoose.Schema(
  {
    shareCode: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, default: "", lowercase: true, trim: true },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    mode: { type: String, default: "Train", trim: true },
    days: { type: Number, default: 3, min: 1, max: 30 },
    budget: { type: String, default: "mid-range", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Itinerary || mongoose.model("Itinerary", itinerarySchema);
