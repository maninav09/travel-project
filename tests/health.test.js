const test = require("node:test");
const assert = require("node:assert/strict");

process.env.USE_MONGO = "false";

const app = require("../server");

test("GET /health returns status ok", async () => {
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.deepEqual(body, { status: "ok" });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
