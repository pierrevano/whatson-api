const crypto = require("crypto");

const { config } = require("../../config");

/**
 * Determines whether a request comes from a trusted client.
 *
 * @param {import("express").Request} req - Incoming request.
 * @returns {boolean} True when the request is trusted.
 */
const isTrustedProxyRequest = (req) => {
  const provided = req.headers["x-client-token"];
  if (!config.clientToken || typeof provided !== "string") return false;

  const providedBuffer = Buffer.from(provided);
  const tokenBuffer = Buffer.from(config.clientToken);
  return (
    providedBuffer.length === tokenBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, tokenBuffer)
  );
};

module.exports = { isTrustedProxyRequest };
