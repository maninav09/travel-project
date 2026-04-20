const useMongoRequested = String(process.env.USE_MONGO || "")
  .trim()
  .toLowerCase() === "true";

let mongoAvailable = useMongoRequested;
let disableReason = "";

const isMongoRequested = () => useMongoRequested;

const isMongoEnabled = () => useMongoRequested && mongoAvailable;

const getMongoDisableReason = () => disableReason;

const disableMongo = (reason = "") => {
  mongoAvailable = false;
  disableReason = String(reason || "").trim();
};

module.exports = {
  disableMongo,
  getMongoDisableReason,
  isMongoEnabled,
  isMongoRequested,
};
