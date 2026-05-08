const { config } = require("../config");

/**
 * Returns the rate limit exceeded message for the given API key.
 *
 * @param {object|null} apiKeyDoc - API key document, or null if no key was provided.
 * @param {number} apiKeyDoc.rate_limit_points - Allowed requests per hour for this key.
 * @returns {string} Message to include in the 429 response.
 */
const getTierMessage = (apiKeyDoc) => {
  if (!apiKeyDoc)
    return `Too many requests (${config.pointsAnonymous} req/h limit). Request a free API key for a higher limit: ${config.contactURL}`;
  const points = apiKeyDoc.rate_limit_points;
  if (points === config.pointsFree)
    return `Too many requests (${config.pointsFree} req/h limit). Become a sponsor for a higher limit: ${config.contactURL}`;
  if (points === config.pointsSponsor)
    return `Too many requests (${config.pointsSponsor} req/h limit). Contact me for a custom limit: ${config.contactURL}`;
  return `Too many requests. Contact me to adjust your custom limit: ${config.contactURL}`;
};

module.exports = { getTierMessage };
