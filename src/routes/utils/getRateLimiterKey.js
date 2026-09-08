const { isIP } = require("net");

/**
 * Resolves the requester identity used as the rate limit key.
 *
 * @param {import("express").Request} req - Incoming request.
 * @returns {string|null} The resolved key, or null if unavailable.
 */
const getRateLimiterKey = (req) => {
  if (process.env.RENDER !== "true") return req.socket.remoteAddress || null;

  const ip = req.headers["cf-connecting-ip"];
  return typeof ip === "string" && isIP(ip) ? ip : null;
};

module.exports = { getRateLimiterKey };
