const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("../config");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});
const database = client.db(config.dbName);
const collectionNameApiKey = database.collection(config.collectionNameApiKey);

const getInternalApiKey = async () =>
  collectionNameApiKey.findOne({
    name: "internal_api_key",
  });

module.exports = getInternalApiKey;
