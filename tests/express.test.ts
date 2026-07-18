require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");

const { applyBaseMiddleware } = require("../src/routes/appMiddleware");
const {
  handleInvalidEndpoint,
} = require("../src/routes/handleInvalidEndpoint");

/**
 * Express behavioral regression suite.
 *
 * Unlike the other test files, this suite is fully self-contained: it builds its own
 * in-process Express app and drives it over an ephemeral port, so it needs neither a
 * running server, MongoDB, nor network access. It exercises the app's framework-level
 * behaviors — routing, middleware ordering, error handling, query parsing, body parsing,
 * static assets and CORS — by reusing the real production middleware (`applyBaseMiddleware`)
 * and the real invalid-endpoint handler.
 */

/**
 * Builds an app that reuses the exact production base middleware (`applyBaseMiddleware`)
 * and the real invalid-endpoint handler, but with lightweight echo/stub routes, so we can
 * observe exactly what Express hands to route handlers without touching business logic or
 * the database.
 *
 * @returns {import("express").Express} Configured test application.
 */
function buildTestApp() {
  const app = express();

  applyBaseMiddleware(app, {
    staticDir: path.join(__dirname, "..", "public"),
  });

  /* Echoes the parsed query object so we can assert query-parser behavior. */
  app.get("/echo/query", (req, res) => {
    res.json({ query: req.query });
  });

  /* Echoes the parsed path params. */
  app.get("/echo/params/:id", (req, res) => {
    res.json({ params: req.params });
  });

  /* Echoes the parsed JSON body so we can assert body parsing. */
  app.post("/echo/body", (req, res) => {
    res.json({ body: req.body });
  });

  /*
   * Reproduces the production pattern of defaulting a value onto req.query and reading it
   * back later; req.query must be a single writable object for the write to persist.
   */
  app.get("/mutate/query", (req, res) => {
    req.query.api_key = req.query.api_key || "api_key_not_provided";

    res.json({
      apiKeyAfterMutation: req.query.api_key,
      apiKeySeenViaSpread: { ...req.query }.api_key,
    });
  });

  /* Real production catch-all + invalid-endpoint handler (404 / 405 logic). */
  app.all("/{*splat}", handleInvalidEndpoint);

  return app;
}

/** @type {import("http").Server} */
let server;
/** @type {string} */
let baseURL;

beforeAll(async () => {
  const app = buildTestApp();
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, () => {
      const { port } = server.address();
      baseURL = `http://127.0.0.1:${port}`;
      resolve(undefined);
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("Express routing", () => {
  test("named-wildcard catch-all returns 404 for unknown endpoints", async () => {
    const res = await fetch(`${baseURL}/does/not/exist`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.message).toContain("Invalid endpoint");
    expect(body.code).toBe(404);
  });

  test("catch-all matches both root-level and deeply nested unknown paths", async () => {
    const shallow = await fetch(`${baseURL}/nope`);
    const deep = await fetch(`${baseURL}/a/b/c/d`);

    expect(shallow.status).toBe(404);
    expect(deep.status).toBe(404);
  });

  test("path parameters are parsed and exposed on req.params", async () => {
    const res = await fetch(`${baseURL}/echo/params/42`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.params.id).toBe("42");
  });
});

describe("Express error handling (405 method-not-allowed)", () => {
  test("known route hit with the wrong method returns 405 and an Allow header", async () => {
    const res = await fetch(`${baseURL}/movie/123`, { method: "POST" });
    const body = await res.json();

    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET");
    expect(body.message).toContain("Method not allowed");
    expect(body.code).toBe(405);
  });

  test("root path with a disallowed method returns 405", async () => {
    const res = await fetch(`${baseURL}/`, { method: "DELETE" });

    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET");
  });
});

describe("Express query parsing", () => {
  test("comma-separated list values are preserved verbatim", async () => {
    const res = await fetch(
      `${baseURL}/echo/query?genres=action,drama&is_active`,
    );
    const { query } = await res.json();

    expect(query.genres).toBe("action,drama");
    expect(query.is_active).toBe("");
  });

  test("query parser stays 'extended' (nested bracket notation is parsed into objects)", async () => {
    // The "extended" parser turns bracket notation into a nested object.
    const res = await fetch(`${baseURL}/echo/query?filter[type]=movie`);
    const { query } = await res.json();

    expect(query.filter).toEqual({ type: "movie" });
  });

  test("repeated keys are collected into an array", async () => {
    const res = await fetch(`${baseURL}/echo/query?id=1&id=2`);
    const { query } = await res.json();

    expect(query.id).toEqual(["1", "2"]);
  });
});

describe("Express req.query mutation persistence", () => {
  test("a default written onto req.query is visible on later reads", async () => {
    const res = await fetch(`${baseURL}/mutate/query`);
    const body = await res.json();

    expect(body.apiKeyAfterMutation).toBe("api_key_not_provided");
    expect(body.apiKeySeenViaSpread).toBe("api_key_not_provided");
  });

  test("an explicitly provided value is not overwritten by the default", async () => {
    const res = await fetch(`${baseURL}/mutate/query?api_key=abc123`);
    const body = await res.json();

    expect(body.apiKeyAfterMutation).toBe("abc123");
    expect(body.apiKeySeenViaSpread).toBe("abc123");
  });
});

describe("Express body parsing (express.json)", () => {
  test("a JSON request body is parsed onto req.body", async () => {
    const res = await fetch(`${baseURL}/echo/body`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world", n: 7 }),
    });
    const { body } = await res.json();

    expect(body).toEqual({ hello: "world", n: 7 });
  });

  test("requests without a JSON content-type are not parsed as JSON", async () => {
    const res = await fetch(`${baseURL}/echo/body`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const { body } = await res.json();

    // express.json() only parses matching content-types; req.body is left unset
    // (and therefore dropped from the JSON response) rather than the raw string.
    expect(body).toBeUndefined();
  });
});

describe("Express static assets", () => {
  test("files under the static directory are served", async () => {
    const res = await fetch(`${baseURL}/robots.txt`);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain("User-agent");
  });
});

describe("Express CORS middleware", () => {
  test("responses expose an Access-Control-Allow-Origin header", async () => {
    const res = await fetch(`${baseURL}/echo/query`, {
      headers: { Origin: "https://example.com" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("pre-flight OPTIONS requests are answered by the CORS layer", async () => {
    const res = await fetch(`${baseURL}/echo/query`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://example.com",
        "Access-Control-Request-Method": "GET",
      },
    });

    expect([200, 204]).toContain(res.status);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toBeTruthy();
  });
});
