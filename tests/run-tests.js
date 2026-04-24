// Purpose: sandbox-friendly test runner for core health, analytics, train fallback, and home logic checks.
const assert = require("node:assert/strict");

process.env.USE_MONGO = "false";

const app = require("../server");
const {
  normalizeHeroIndex,
  nextHeroIndex,
  prevHeroIndex,
  validateRouteInputs,
} = require("../public/home-logic");

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test("GET /health returns status ok", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/analytics accepts supported events", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "route_search",
        page: "home",
        metadata: { mode: "Train" },
      }),
    });
    assert.equal(response.status, 202);
    const body = await response.json();
    assert.equal(body.ok, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/analytics rejects unsupported events", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "unknown_event",
        page: "home",
      }),
    });
    assert.equal(response.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/trains returns generated fallback data without MongoDB", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(
      `http://127.0.0.1:${port}/api/trains?from=Delhi&to=Jaipur`
    );

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.source, "fallback");
    assert.ok(Array.isArray(body.trains));
    assert.ok(body.trains.length > 0);
    assert.equal(body.trains[0].fromCity, "Delhi");
    assert.equal(body.trains[0].toCity, "Jaipur");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

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

(async () => {
  let failures = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}`);
      console.error(error?.stack || error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${tests.length}/${tests.length} tests`);
})();
