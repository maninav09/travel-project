/* Purpose: reusable homepage helper functions that are also covered by unit tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.HomeLogic = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const normalizeHeroIndex = (index, total) => {
    const max = Number(total) || 0;
    if (max <= 0) return 0;
    const value = Number(index) || 0;
    return ((value % max) + max) % max;
  };

  const nextHeroIndex = (current, total) =>
    normalizeHeroIndex((Number(current) || 0) + 1, total);

  const prevHeroIndex = (current, total) =>
    normalizeHeroIndex((Number(current) || 0) - 1, total);

  const validateRouteInputs = (from, to) => {
    const cleanFrom = String(from || "").trim();
    const cleanTo = String(to || "").trim();
    if (cleanFrom.length < 2 || cleanTo.length < 2) {
      return {
        valid: false,
        message: "Please enter valid city names (minimum 2 characters).",
      };
    }
    if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      return {
        valid: false,
        message: "Departure and destination cannot be the same city.",
      };
    }
    return { valid: true, message: "" };
  };

  return {
    normalizeHeroIndex,
    nextHeroIndex,
    prevHeroIndex,
    validateRouteInputs,
  };
});
