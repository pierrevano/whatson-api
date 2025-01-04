const newrelic = require("newrelic");

const { aggregateData } = require("../aggregateData");
const { config } = require("../config");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { sendInternalError, sendRequest } = require("../utils/sendRequest");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);
const collectionNameApiKey = database.collection(config.collectionNameApiKey);

const getId = async (req, res) => {
  try {
    const id_path = parseInt(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;
    const url = `${req.headers["host"]}${req.url}`;
    const item_type = url.split("/")[1] === "movie" ? "movie" : "tvshow";
    const critics_rating_details_query = req.query.critics_rating_details;
    const episodes_details_query = req.query.episodes_details;
    const api_key_query = req.query.api_key || "api_key_not_provided";

    const internal_api_key = await collectionNameApiKey.findOne({
      name: "internal_api_key",
    });

    if (api_key_query === internal_api_key.value) {
      const transaction = newrelic.getTransaction();
      transaction.ignore();
    } else {
      newrelic.addCustomAttributes(req.query);
    }

    if (id_path && ratings_filters_query) {
      try {
        const { items } = await aggregateData(
          critics_rating_details_query,
          undefined,
          episodes_details_query,
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
        let projection = {};
        if (!critics_rating_details_query === "true")
          projection.critics_rating_details = 0;
        if (!episodes_details_query === "true") projection.episodes_details = 0;

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
