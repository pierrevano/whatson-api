const { RateLimiterMemory } = require("rate-limiter-flexible");

const { config } = require("../config");
const { getApiKey } = require("./getApiKey");
const { sendResponse } = require("./sendRequest");
const { sendToNewRelic } = require("./sendToNewRelic");

/**
 * Builds a memory-based rate limiter with the shared configuration defaults.
 *
 * @param {number} points - Maximum number of requests allowed per window.
 * @returns {RateLimiterMemory} Configured rate limiter instance.
 */
const createRateLimiter = (points) =>
  new RateLimiterMemory({
    points, // maximum number of requests
    duration: config.duration, // window duration in seconds
    blockDuration: config.blockDuration, // block duration in seconds if rate limit is exceeded
  });

const defaultLimiter = createRateLimiter(config.points);

// One persistent limiter instance per API key to preserve counters across requests.
const keyedLimiters = new Map();

/**
 * Normalises the requester identity used as the rate limit key.
 *
 * @param {import("express").Request} req - Incoming request.
 * @returns {string} IP address or the first forwarded IP value.
 */
const getRateLimiterKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  return forwardedFor ? forwardedFor.split(",")[0].trim() : req.ip;
};

/**
 * Express middleware enforcing rate limits based on the provided API key or client IP.
 *
 * @param {import("express").Request} req - Express request.
 * @param {import("express").Response} res - Express response.
 * @param {import("express").NextFunction} next - Next middleware callback.
 * @returns {Promise<void>}
 */
const limiter = async (req, res, next) => {
  const apiKeyValue = req.query.api_key;

  let rateLimiter = defaultLimiter;
  let key = getRateLimiterKey(req);

  if (apiKeyValue) {
    const apiKeyDoc = await getApiKey(apiKeyValue);

    if (apiKeyDoc) {
      if (apiKeyDoc.is_internal) return next();

      if (!keyedLimiters.has(apiKeyValue)) {
        keyedLimiters.set(
          apiKeyValue,
          createRateLimiter(apiKeyDoc.rate_limit_points),
        );
      }
      rateLimiter = keyedLimiters.get(apiKeyValue);
      key = apiKeyValue;
    }
  }

  try {
    const result = await rateLimiter.consume(key);
    const rateLimitHeaders = {
      "X-RateLimit-Limit": result.remainingPoints + result.consumedPoints,
      "X-RateLimit-Remaining": result.remainingPoints,
      "X-RateLimit-Reset": new Date(
        Date.now() + result.msBeforeNext,
      ).toISOString(),
    };

    console.log("Rate Limit Headers:", rateLimitHeaders);

    res.set(rateLimitHeaders);
    sendToNewRelic(req, null, null, rateLimitHeaders);
    next();
  } catch (result) {
    const rateLimitHeaders = {
      "Retry-After": Math.ceil(result.msBeforeNext / 1000),
    };

    console.log("Rate Limit Headers on error:", rateLimitHeaders);

    res.set(rateLimitHeaders);
    sendToNewRelic(req, null, null, rateLimitHeaders);
    sendResponse(res, 429, {
      message:
        "Too many requests. Please try again later. If you need an API key for higher limits, contact me on: https://pierrevano.github.io",
    });
  }
};

module.exports = { limiter };
