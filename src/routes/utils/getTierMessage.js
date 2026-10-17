const { config } = require("../../config");

/**
 * Returns the rate limit exceeded message for the given API key.
 *
 * @param {object|null} apiKeyDoc - API key document, or null if no key was provided.
 * @param {number} apiKeyDoc.rate_limit_points - Allowed requests per day for this key.
 * @param {"minute"|"daily"} rateLimitWindow - The exceeded rate limit window.
 * @returns {string} Message to include in the 429 response.
 */
const getTierMessage = (apiKeyDoc, rateLimitWindow) => {
  if (rateLimitWindow === "minute")
    return `Too many requests (${config.pointsPerMinute} req/min limit).`;

  const points = apiKeyDoc?.rate_limit_points ?? config.pointsAnonymous;
  const limitMessage = `Too many requests (${points} req/day limit).`;
  if (!apiKeyDoc)
    return `${limitMessage} Request a free API key for a higher limit: ${config.contactURL}`;
  if (points === config.pointsFree)
    return `${limitMessage} Become a $1/month sponsor for a higher limit: ${config.contactURL}`;
  if (points === config.pointsSponsor)
    return `${limitMessage} Contact me for a custom limit: ${config.contactURL}`;
  return `${limitMessage} Contact me to adjust your custom limit: ${config.contactURL}`;
};

module.exports = { getTierMessage };
