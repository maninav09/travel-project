// Purpose: verifies train fallback stays available when MongoDB is disabled.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.USE_MONGO = "false";

const app = require("../server");

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
