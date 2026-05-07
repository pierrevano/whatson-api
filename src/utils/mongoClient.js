const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("../config");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;

/**
 * Shared MongoDB client — single instance to maintain one connection pool across all modules.
 *
 * @type {import("mongodb").MongoClient}
 */
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
const db = client.db(config.dbName);

const collectionApiKey = db.collection(config.collectionNameApiKey);
const collectionData = db.collection(config.collectionName);
const collectionPreferences = db.collection(config.collectionNamePreferences);

module.exports = {
  client,
  collectionApiKey,
  collectionData,
  collectionPreferences,
};
