const { collectionApiKey: collection } = require("../utils/mongoClient");
const { config } = require("../config");

let cache = null;

/**
 * Returns the internal API key document, using a short-lived in-memory cache.
 *
 * @returns {Promise<object|null>}
 */
const getInternalApiKey = async () => {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.doc;
  }

  try {
    const doc = await collection.findOne({ is_internal: true });
    cache = { doc, expiresAt: Date.now() + config.cacheTtlMs };
    return doc;
  } catch {
    return null;
  }
};

module.exports = getInternalApiKey;
