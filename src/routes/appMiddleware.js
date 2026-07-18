const cors = require("cors");
const express = require("express");

/**
 * Applies the shared application-level middleware to an Express app.
 *
 * @param {import("express").Express} app - Express application to configure.
 * @param {{ staticDir: string }} options - Configuration options.
 * @param {string} options.staticDir - Absolute path to the directory served as static assets.
 * @returns {import("express").Express} The same app, for chaining.
 */
const applyBaseMiddleware = (app, { staticDir }) => {
  /* Use the "extended" query string parser. */
  app.set("query parser", "extended");

  /* Expose req.query as a writable object. */
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

  /* Handle CORS pre-flight requests. */
  app.options("/{*splat}", cors());

  app.use(express.static(staticDir));

  app.use(express.json());

  return app;
};

module.exports = { applyBaseMiddleware };
