const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    operator: { type: String, required: true },
    busNumber: { type: String, required: true },
    type: { type: String, required: true },
    fromCity: { type: String, required: true },
    toCity: { type: String, required: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    boardingPoint: { type: String, required: true },
    seatsAvailable: { type: Number, required: true },
    fare: { type: Number, required: true },
  },
  { timestamps: true }
);

busSchema.index({ fromCity: 1, toCity: 1 });

module.exports = mongoose.model("Bus", busSchema);
