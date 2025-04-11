const { MongoClient, ServerApiVersion } = require("mongodb");

const { aggregateData } = require("../aggregateData");
const { config } = require("../config");
const { sendInternalError, sendRequest } = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const { buildProjection } = require("../utils/buildProjection");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);
const collectionNameApiKey = database.collection(config.collectionNameApiKey);

const getId = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    const id_path = parseInt(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;
    const url = `${req.headers["host"]}${req.url}`;
    const item_type = url.split("/")[1] === "movie" ? "movie" : "tvshow";
    const append_to_response = req.query.append_to_response;

    const internal_api_key = await collectionNameApiKey.findOne({
      name: "internal_api_key",
    });

    sendToNewRelic(req, api_key_query, internal_api_key);

    if (id_path && ratings_filters_query) {
      try {
        const { items } = await aggregateData(
          append_to_response,
          undefined,
          undefined,
          id_path,
          undefined,
          item_type_query,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          ratings_filters_query,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        const filteredResults = items[0].results.filter((result) => {
          return result.item_type === item_type;
        });
        await sendRequest(
          req,
          res,
          filteredResults[0],
          item_type_query,
          null,
          config,
        );
      } catch (error) {
        await sendInternalError(res, error);
      }
    } else {
      try {
        // Dynamically build the projection object based on query parameters
        const projection = buildProjection(append_to_response);

        const query = { id: id_path, item_type: item_type };
        const items = await collectionData.findOne(query, { projection });

        await sendRequest(req, res, items, item_type_query, null, config);
      } catch (error) {
        await sendInternalError(res, error);
      }
    }
  } catch (error) {
    await sendInternalError(res, error);
  }
};

module.exports = getId;
