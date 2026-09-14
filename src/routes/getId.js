const { aggregateData } = require("./aggregateData");
const { config } = require("../config");
const {
  sendInternalError,
  sendRequest,
  sendResponse,
} = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const { validateIntegerParam } = require("./utils/queryValidationMessages");
const getInternalApiKey = require("./getInternalApiKey");

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

    if (validateIntegerParam(req.params.id, "id")) {
      return sendResponse(res, 404, {
        message: config.noMatchingItemsFoundMessage,
      });
    }
    const id_path = Number(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;
    const item_type = req.route.path.split("/")[1];
    const append_to_response = req.query.append_to_response;

    const internal_api_key = await getInternalApiKey();

    const newRelicQueryAttributes = {
      ...req.query,
      path_id: id_path,
      new_relic_route: "getId",
    };

    sendToNewRelic(
      req,
      api_key_query,
      internal_api_key,
      newRelicQueryAttributes,
    );

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
    );
    const item = (items[0]?.results || []).find(
      (result) => result.item_type === item_type,
    );
    await sendRequest(req, res, item, config);
  } catch (error) {
    await sendInternalError(res, error);
  }
};

module.exports = getId;
