/**
 * Resolves the requester identity used as the rate limit key.
 *
 * @param {import("express").Request} req - Incoming request.
 * @returns {string} The resolved requester identity.
 */
const getRateLimiterKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  return forwardedFor ? forwardedFor.split(",")[0].trim() : req.ip;
};

module.exports = { getRateLimiterKey };
