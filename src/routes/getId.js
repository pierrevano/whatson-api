const { MongoClient, ServerApiVersion } = require("mongodb");

const { aggregateData } = require("./aggregateData");
const { buildProjection } = require("./buildProjection");
const { config } = require("../config");
const {
  sendInternalError,
  sendRequest,
  sendResponse,
} = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const {
  invalidItemTypeMessage,
  isValidItemType,
} = require("../utils/itemTypeValidation");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);
const collectionNameApiKey = database.collection(config.collectionNameApiKey);

/**
 * Resolves a single item by its numeric identifier, optionally applying ratings filters or
 * additional projection fields, and streams the outcome through the shared request helpers.
 *
 * @param {import("express").Request} req - Express request carrying path params and optional filters.
 * @param {import("express").Response} res - Express response instance used to emit the result or error.
 * @returns {Promise<void>} Resolves once the response has been dispatched.
 */
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

    if (!isValidItemType(item_type_query)) {
      return sendResponse(res, 400, {
        message: invalidItemTypeMessage(item_type_query),
      });
    }

    const internal_api_key = await collectionNameApiKey.findOne({
      name: "internal_api_key",
    });

    const newRelicQueryAttributes = {
      ...req.query,
      path_id: Number.isFinite(id_path) ? id_path : "invalid_or_missing",
      new_relic_route: "getId",
    };

    sendToNewRelic(
      req,
      api_key_query,
      internal_api_key,
      newRelicQueryAttributes,
    );

    if (id_path && ratings_filters_query) {
      try {
        const { items } = await aggregateData(
          append_to_response,
          undefined,
          undefined,
          undefined,
          undefined,
          id_path,
          undefined,
          undefined,
          undefined,
          undefined,
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
