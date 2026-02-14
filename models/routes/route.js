const mongoose = require("mongoose");

const detailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    highlight: { type: String, required: true },
    stop: { type: String, required: true },
    timing: { type: String, required: true },
    rating: { type: String },
    price: { type: String },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    mode: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    userEmail: { type: String, default: "" },
    duration: { type: String, default: "" },
    durationByMode: {
      train: { type: String, default: "" },
      bus: { type: String, default: "" },
      cab: { type: String, default: "" },
    },
    summary: { type: String, default: "" },
    foodCorners: { type: [detailSchema], default: [] },
    hotels: { type: [detailSchema], default: [] },
    restaurants: { type: [detailSchema], default: [] },
    places: { type: [detailSchema], default: [] },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Route", routeSchema);
