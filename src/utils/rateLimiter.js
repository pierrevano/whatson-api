const { RateLimiterMemory } = require("rate-limiter-flexible");

const { config } = require("../config");
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
    points: points, // maximum number of requests
    duration: config.duration, // window duration in seconds
    blockDuration: config.blockDuration, // block duration in seconds if rate limit is exceeded
  });

const defaultLimiter = createRateLimiter(config.points);
const higherLimiter = createRateLimiter(config.higher_points);

/**
 * Normalises the requester identity used as the rate limit key.
 *
 * @param {import("express").Request} req - Incoming request.
 * @returns {string} IP address or the first forwarded IP value.
 */
const getRateLimiterKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = req.ip;

  const ipOrForwardedFor = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : ip;

  return ipOrForwardedFor;
};

/**
 * Express middleware enforcing per-IP rate limits while bypassing trusted internal keys.
 *
 * @param {import("express").Request} req - Express request.
 * @param {import("express").Response} res - Express response.
 * @param {import("express").NextFunction} next - Next middleware callback.
 * @returns {void}
 */
const limiter = (req, res, next) => {
  const isInternalApiKeyValid =
    req.query.api_key !== undefined &&
    config.internalApiKey !== undefined &&
    req.query.api_key === config.internalApiKey;
  console.log("Internal API key:", config.internalApiKey);
  console.log("API key validity:", isInternalApiKeyValid);

  const rateLimiter = isInternalApiKeyValid ? higherLimiter : defaultLimiter;

  if (isInternalApiKeyValid) {
    return next(); // Ignore rate limiting for internal API key
  }

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

module.exports = { limiter };
