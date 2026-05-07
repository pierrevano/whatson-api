const { collectionApiKey: collection } = require("./mongoClient");
const { config } = require("../config");

const cache = new Map();

/**
 * Returns the API key document for the given value, using a short-lived in-memory cache.
 * Inactive API keys are treated as not found.
 *
 * @param {string|undefined} value - The api_key query parameter value.
 * @returns {Promise<object|null>}
 */
const getApiKey = async (value) => {
  if (!value) return null;

  const cached = cache.get(value);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.doc;
  }

  try {
    const doc = await collection.findOne({ value, is_active: true });
    cache.set(value, { doc, expiresAt: Date.now() + config.cacheTtlMs });
    return doc;
  } catch {
    return null;
  }
};

module.exports = { getApiKey };
