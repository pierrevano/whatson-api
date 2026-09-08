const { client } = require("../../utils/mongoClient");
const { config } = require("../../config");
const { getApiKey } = require("./getApiKey");
const { getRateLimiterKey } = require("./getRateLimiterKey");
const { getTierMessage } = require("./getTierMessage");
const { isSponsorApiKey } = require("./isSponsorApiKey");
const {
  RateLimiterMemory,
  RateLimiterMongo,
} = require("rate-limiter-flexible");
const { sendResponse } = require("../../utils/sendRequest");
const { sendToNewRelic } = require("../../utils/sendToNewRelic");

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

/**
 * Builds a Mongo-based rate limiter with the shared configuration defaults.
 *
 * @param {number} points - Maximum number of requests allowed per window.
 * @returns {RateLimiterMongo} Configured rate limiter instance.
 */
const createDailyLimiter = (points) =>
  new RateLimiterMongo({
    storeClient: client,
    dbName: config.dbName,
    tableName: config.collectionNameRateLimit,
    points, // maximum number of requests
    duration: config.dailyDuration, // window duration in seconds
  });

const createLimiters = (points) => [
  createRateLimiter(points),
  createDailyLimiter(points * config.dailyMultiplier),
];

const defaultLimiters = createLimiters(config.pointsAnonymous);

// Persistent limiter instances per API key to preserve counters across requests.
const keyedLimiters = new Map();

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

  let apiKeyDoc = null;
  let key = getRateLimiterKey(req);
  let [rateLimiter, dailyLimiter] = defaultLimiters;

  if (apiKeyValue) {
    apiKeyDoc = await getApiKey(apiKeyValue);

    if (apiKeyDoc) {
      if (apiKeyDoc.is_internal) return next();

      if (!keyedLimiters.has(apiKeyValue)) {
        keyedLimiters.set(
          apiKeyValue,
          createLimiters(apiKeyDoc.rate_limit_points),
        );
      }
      [rateLimiter, dailyLimiter] = keyedLimiters.get(apiKeyValue);
      key = apiKeyValue;
    }
  }

  if (!key) {
    return sendResponse(res, 503, {
      message: `We could not process your request due to a connection issue. Please retry or contact me at ${config.contactURL} if it persists.`,
    });
  }

  try {
    const result = await rateLimiter.consume(key);
    if (!isSponsorApiKey(apiKeyDoc)) await dailyLimiter.consume(key);
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
    /* Let the request through unless a rate limit was exceeded. */
    if (result?.msBeforeNext === undefined) return next();

    const rateLimitHeaders = {
      "Retry-After": Math.ceil(result.msBeforeNext / 1000),
    };

    console.log("Rate Limit Headers on error:", rateLimitHeaders);

    res.set(rateLimitHeaders);
    sendToNewRelic(req, null, null, rateLimitHeaders);
    sendResponse(res, 429, { message: getTierMessage(apiKeyDoc) });
  }
};

module.exports = { limiter };
