const { config } = require("../config");

/**
 * Returns true when the API key document belongs to a sponsor or internal tier.
 *
 * @param {object|null} apiKeyDoc - Document returned by getApiKey, or null when no key was provided.
 * @returns {boolean}
 */
const isSponsorApiKey = (apiKeyDoc) => {
  if (!apiKeyDoc) return false;
  if (apiKeyDoc.is_internal) return true;
  return apiKeyDoc.rate_limit_points >= config.pointsSponsor;
};

module.exports = { isSponsorApiKey };
