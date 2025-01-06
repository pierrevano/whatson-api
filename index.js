require("dotenv").config();

const express = require("express");
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

// Setting CORS headers
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

app.use(express.json());

// Initialize rate limiter with in-memory storage
const rateLimiter = new RateLimiterMemory({
  points: config.points, // maximum number of requests
  duration: config.duration, // window duration in seconds
  blockDuration: config.blockDuration, // block duration in seconds if rate limit is exceeded
});

// Middleware to apply rate limiting
const limiter = (req, res, next) => {
  if (req.query.api_key === config.internalApiKey) {
    return next(); // Ignore rate limiting for internal API key
  }

  rateLimiter
    .consume(req.ip)
    .then((rateLimiterRes) => {
      res.set({
        "X-RateLimit-Limit": config.points,
        "X-RateLimit-Remaining": rateLimiterRes.remainingPoints,
        "X-RateLimit-Reset": new Date(
          Date.now() + rateLimiterRes.msBeforeNext,
        ).toISOString(),
      });
      next(); // Allow the request if within the limit
    })
    .catch((rateLimiterRes) => {
      res.set({
        "Retry-After": Math.ceil(rateLimiterRes.msBeforeNext / 1000),
      });
      sendResponse(res, 429, {
        message:
          "Too many requests. Please try again later. If you need an API key for higher limits, contact me on: https://pierrevano.github.io",
      });
    });
};

// Apply the rate limiter to all routes
app.use(limiter);

/* A route that is used to get the data for all items. */
app.get("/", getItems);

/* A route that is used to get the data for a specific movie. */
app.get("/movie/:id", getId);

/* A route that is used to get the data for a specific tvshow. */
app.get("/tvshow/:id", getId);

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
