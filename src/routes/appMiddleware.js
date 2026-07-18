const cors = require("cors");
const express = require("express");

/**
 * Applies the application-level Express middleware shared by the HTTP server (index.js)
 * and the Express behavioral test suite. Centralising it keeps the production wiring
 * and the tests that guard it from drifting apart.
 *
 * @param {import("express").Express} app - Express application to configure.
 * @param {{ staticDir: string }} options - Configuration options.
 * @param {string} options.staticDir - Absolute path to the directory served as static assets.
 * @returns {import("express").Express} The same app, for chaining.
 */
const applyBaseMiddleware = (app, { staticDir }) => {
  /* Parse query strings with the "extended" parser (nested objects and arrays). */
  app.set("query parser", "extended");

  /* Expose req.query as a single writable object so handlers can assign onto it
   * (e.g. `req.query.api_key = ...`) and have the change persist across reads. */
  app.use((req, _res, next) => {
    Object.defineProperty(req, "query", {
      value: req.query,
      writable: true,
      configurable: true,
    });
    next();
  });

  /* Use CORS middleware. */
  app.use(cors());

  /* Answer CORS pre-flight requests on every path. */
  app.options("/{*splat}", cors());

  app.use(express.static(staticDir));

  app.use(express.json());

  return app;
};

module.exports = { applyBaseMiddleware };
