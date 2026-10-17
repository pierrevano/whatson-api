const { client } = require("../../utils/mongoClient");
const { config } = require("../../config");
const { getApiKey } = require("./getApiKey");
const { getRateLimiterKey } = require("./getRateLimiterKey");
const { getTierMessage } = require("./getTierMessage");
const {
  ignoreNewRelicTransaction,
  sendToNewRelic,
} = require("../../utils/sendToNewRelic");
const {
  RateLimiterMemory,
  RateLimiterMongo,
} = require("rate-limiter-flexible");
const { sendResponse } = require("../../utils/sendRequest");

/**
 * Builds a memory-based rate limiter with the shared configuration defaults.
 *
 * @returns {RateLimiterMemory} Configured rate limiter instance.
 */
const createRateLimiter = () =>
  new RateLimiterMemory({
    points: config.pointsPerMinute, // maximum number of requests
    duration: config.duration, // window duration in seconds
    blockDuration: config.duration, // block duration in seconds if rate limit is exceeded
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

const createLimiters = (points = config.pointsAnonymous) => [
  createRateLimiter(),
  createDailyLimiter(points),
];

const defaultLimiters = createLimiters();

// Persistent limiter instances per API key to preserve counters across requests.
const keyedLimiters = new Map();

/**
 * Express middleware enforcing rate limits based on the provided API key or client IP.
 *
 * @param {import("express").Request} req - Express request.
 * @param {import("express").Response} res - Express response.
 * @param {import("express").NextFunction} next - Next middleware callback.
 * @returns {Promise<import("express").Response|void>}
 */
const limiter = async (req, res, next) => {
  const apiKeyValue = req.query.api_key;

  let apiKeyDoc = null;
  let key = getRateLimiterKey(req);
  let [rateLimiter, dailyLimiter] = defaultLimiters;

  if (apiKeyValue) {
    apiKeyDoc = await getApiKey(apiKeyValue);

    if (apiKeyDoc) {
      if (apiKeyDoc.is_internal) {
        ignoreNewRelicTransaction();
        return next();
      }

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

  let rateLimitWindow = "minute";
  try {
    const result = await rateLimiter.consume(key);
    rateLimitWindow = "daily";
    await dailyLimiter.consume(key);
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
    sendToNewRelic(req, null, null, {
      ...rateLimitHeaders,
      rate_limit_window: rateLimitWindow,
      auth_category: apiKeyDoc
        ? "valid_key"
        : apiKeyValue
          ? "invalid_key"
          : "anonymous",
    });
    sendResponse(res, 429, {
      message: getTierMessage(apiKeyDoc, rateLimitWindow),
    });
  }
};

module.exports = { limiter };
