const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: "web" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema);
