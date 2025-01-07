require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("path");
const { RateLimiterMemory } = require("rate-limiter-flexible");

const app = express();
const PORT = process.env.PORT || 8081;

const { config } = require("./src/config");
const { sendInternalError, sendResponse } = require("./src/utils/sendRequest");
const {
  getUserPreferences,
  saveOrUpdateUserPreferences,
} = require("./src/routes/getOrSaveUserPreferences");
const getId = require("./src/routes/getId");
const getItems = require("./src/routes/getItems");
const { sendToNewRelic } = require("./src/utils/sendToNewRelic");

// Use CORS middleware
app.use(cors());

// Handle pre-flight requests
app.options("*", cors());

app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

// Initialize rate limiter with in-memory storage
const createRateLimiter = (points) =>
  new RateLimiterMemory({
    points: points, // maximum number of requests
    duration: config.duration, // window duration in seconds
    blockDuration: config.blockDuration, // block duration in seconds if rate limit is exceeded
  });

// Middleware to apply rate limiting
const defaultLimiter = createRateLimiter(config.points);
const higherLimiter = createRateLimiter(config.higher_points);

const getRateLimiterKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "unknown";

  const ipOrForwardedFor = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : ip;

  return `${ipOrForwardedFor}-${userAgent}`;
};

const limiter = (req, res, next) => {
  const isInternalApiKeyValid =
    req.query.api_key !== undefined &&
    config.internalApiKey !== undefined &&
    req.query.api_key === config.internalApiKey;
  console.log("Internal API key:", config.internalApiKey);
  console.log("API key validity:", isInternalApiKeyValid);

  const rateLimiter = isInternalApiKeyValid ? higherLimiter : defaultLimiter;

  rateLimiter
    .consume(getRateLimiterKey(req))
    .then((rateLimiterRes) => {
      const rateLimitHeaders = {
        "X-RateLimit-Limit":
          rateLimiterRes.remainingPoints + rateLimiterRes.consumedPoints,
        "X-RateLimit-Remaining": rateLimiterRes.remainingPoints,
        "X-RateLimit-Reset": new Date(
          Date.now() + rateLimiterRes.msBeforeNext,
        ).toISOString(),
      };

      console.log("Rate Limit Headers:", rateLimitHeaders);

      res.set(rateLimitHeaders);

      sendToNewRelic(req, null, null, rateLimitHeaders);

      next(); // Allow the request if within the limit
    })
    .catch((rateLimiterRes) => {
      const rateLimitHeaders = {
        "Retry-After": Math.ceil(rateLimiterRes.msBeforeNext / 1000),
      };

      console.log("Rate Limit Headers on error:", rateLimitHeaders);

      res.set(rateLimitHeaders);

      sendToNewRelic(req, null, null, rateLimitHeaders);

      sendResponse(res, 429, {
        message:
          "Too many requests. Please try again later. If you need an API key for higher limits, contact me on: https://pierrevano.github.io",
      });
    });
};

/* A route that is used to get the data for all items. */
app.get("/", limiter, getItems);

/* A route that is used to get the data for a specific movie. */
app.get("/movie/:id", limiter, getId);

/* A route that is used to get the data for a specific tvshow. */
app.get("/tvshow/:id", limiter, getId);

/* A route to get user preferences */
app.get("/preferences/:email", getUserPreferences);

/* A route to save or update user preferences */
app.post("/preferences/:email", saveOrUpdateUserPreferences);

/* Catch-all route for invalid endpoints */
app.all("*", (req, res) => {
  const error = new Error(
    `Invalid endpoint: ${req.originalUrl}. Allowed endpoints are: '/', '/movie/:id', '/tvshow/:id'.`,
  );
  sendInternalError(res, error);
});

/* Starting the server on the port defined in the PORT variable. */
app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});
