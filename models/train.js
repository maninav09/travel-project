// Purpose: MongoDB model for train route options and seeded train data.
const mongoose = require("mongoose");

const trainSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    number: { type: String, required: true },
    engineNumber: { type: String, required: true },
    fromCity: { type: String, required: true },
    toCity: { type: String, required: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    platform: { type: String, required: true },
    classes: {
      ac: { type: Boolean, default: true },
      sleeper: { type: Boolean, default: true },
      general: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

trainSchema.index({ fromCity: 1, toCity: 1 });

module.exports = mongoose.model("Train", trainSchema);
