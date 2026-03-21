// Purpose: verifies frontend home-page helper logic with fast unit tests.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeHeroIndex,
  nextHeroIndex,
  prevHeroIndex,
  validateRouteInputs,
} = require("../public/home-logic");

test("hero slider index helpers wrap correctly", () => {
  assert.equal(normalizeHeroIndex(5, 4), 1);
  assert.equal(normalizeHeroIndex(-1, 4), 3);
  assert.equal(nextHeroIndex(3, 4), 0);
  assert.equal(prevHeroIndex(0, 4), 3);
});

test("route form validation rejects invalid inputs", () => {
  assert.equal(validateRouteInputs("A", "Delhi").valid, false);
  assert.equal(validateRouteInputs("Delhi", "Delhi").valid, false);
  assert.equal(validateRouteInputs("Delhi", "Jaipur").valid, true);
});
