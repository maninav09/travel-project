const mongoose = require("mongoose");

const cabSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    vehicleType: { type: String, required: true },
    carModel: { type: String, required: true },
    fromCity: { type: String, required: true },
    toCity: { type: String, required: true },
    pickupTime: { type: String, required: true },
    eta: { type: String, required: true },
    seats: { type: Number, required: true },
    fare: { type: Number, required: true },
    driverName: { type: String, required: true },
    driverRating: { type: Number, required: true },
  },
  { timestamps: true }
);

cabSchema.index({ fromCity: 1, toCity: 1 });

module.exports = mongoose.model("Cab", cabSchema);
