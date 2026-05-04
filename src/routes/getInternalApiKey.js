const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("../config");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
const collection = client
  .db(config.dbName)
  .collection(config.collectionNameApiKey);

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
