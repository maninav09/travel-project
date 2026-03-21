// Purpose: verifies analytics endpoints and guards against tracking regressions.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.USE_MONGO = "false";

const app = require("../server");

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
