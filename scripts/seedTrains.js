// Purpose: seeds train records so the app has fallback data without a live provider.
require("dotenv").config();
const mongoose = require("mongoose");
const Train = require("../models/train");

const cities = [
  "New Delhi",
  "Mumbai",
  "Kolkata",
  "Chennai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Ahmedabad",
  "Varanasi",
  "Amritsar",
  "Bhopal",
  "Indore",
  "Patna",
  "Nagpur",
  "Coimbatore",
  "Surat",
  "Agra",
  "Goa",
];

const trainNames = [
  "Rajdhani Express",
  "Shatabdi Express",
  "Duronto Express",
  "Garib Rath",
  "Intercity Express",
  "Vande Bharat",
  "Jan Shatabdi",
  "Tejas Express",
  "Sampark Kranti",
  "Humsafar Express",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pad = (num) => String(num).padStart(2, "0");
const randomTime = () => {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 60);
  return `${pad(h)}:${pad(m)}`;
};

const randomEngine = () => {
  const types = ["WAP-7", "WAP-5", "WAG-9", "WDP-4D"];
  const type = pick(types);
  const num = 30000 + Math.floor(Math.random() * 9000);
  return `${type} ${num}`;
};

const randomPlatform = () => String(1 + Math.floor(Math.random() * 12));

const makeTrain = (idx) => {
  let from = pick(cities);
  let to = pick(cities);
  while (to === from) to = pick(cities);
  const baseName = pick(trainNames);
  const name = `${from.split(" ")[0]} ${baseName}`;
  const number = String(12000 + idx);
  return {
    name,
    number,
    engineNumber: randomEngine(),
    fromCity: from,
    toCity: to,
    departureTime: randomTime(),
    arrivalTime: randomTime(),
    platform: randomPlatform(),
    classes: {
      ac: Math.random() > 0.2,
      sleeper: Math.random() > 0.1,
      general: true,
    },
  };
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGO_URI");
  }
  await mongoose.connect(mongoUri);
  await Train.deleteMany({});
  const trains = Array.from({ length: 100 }, (_, i) => makeTrain(i + 1));
  await Train.insertMany(trains);
  await mongoose.disconnect();
  console.log("Seeded 100 trains");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
