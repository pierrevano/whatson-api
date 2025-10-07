const { MongoClient, ServerApiVersion } = require("mongodb");

const { aggregateData } = require("./aggregateData");
const { config } = require("../config");
const { sendInternalError, sendRequest } = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const findId = require("./findId");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});
const database = client.db(config.dbName);
const collectionNameApiKey = database.collection(config.collectionNameApiKey);

/**
 * Handles the public `/items` endpoint by translating query parameters into a Mongo aggregation
 * pipeline, enriching the response when identifier searches are detected, and delegating the
 * response serialization to the shared request helpers.
 *
 * @param {import("express").Request} req - Express request containing filters and pagination options.
 * @param {import("express").Response} res - Express response used to return JSON payloads or errors.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
const getItems = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    // Numeric query parameters
    const id_path = Number(req.params.id);
    const limit_query = Number(req.query.limit);
    const page_query = Number(req.query.page);

    const {
      append_to_response,
      critics_certified: is_critics_certified_query,
      directors: directors_query,
      filtered_seasons: filtered_seasons_query,
      genres: genres_query,
      runtime: runtime_query,
      is_active: is_active_query,
      is_adult: is_adult_query,
      item_type: item_type_query,
      minimum_ratings: minimum_ratings_query,
      must_see: is_must_see_query,
      networks: networks_query,
      platforms: platforms_query,
      popularity_filters: popularity_filters_query,
      production_companies: production_companies_query,
      ratings_filters: ratings_filters_query,
      release_date: release_date_query,
      seasons_number: seasons_number_query,
      status: status_query,
      users_certified: is_users_certified_query,
    } = req.query;

    const internal_api_key = await collectionNameApiKey.findOne({
      name: "internal_api_key",
    });

    sendToNewRelic(req, api_key_query, internal_api_key);

    let { items, limit, page, is_active_item } = await aggregateData(
      append_to_response,
      directors_query,
      genres_query,
      networks_query,
      production_companies_query,
      id_path,
      is_active_query,
      is_adult_query,
      is_must_see_query,
      is_users_certified_query,
      is_critics_certified_query,
      item_type_query,
      limit_query,
      minimum_ratings_query,
      page_query,
      platforms_query,
      popularity_filters_query,
      ratings_filters_query,
      release_date_query,
      runtime_query,
      seasons_number_query,
      filtered_seasons_query,
      status_query,
    );
    const results = items && items.length > 0 ? items[0].results : [];
    const total_results =
      results.length > 0 ? items[0].total_results[0].total_results : 0;

    let json = {
      page,
      results,
      total_pages: Math.ceil(total_results / limit),
      total_results,
    };

    for (let index = 0; index < config.keysToCheckForSearch.length; index++) {
      const key = config.keysToCheckForSearch[index];

      const lowerCaseQuery = {};
      for (let queryKey in req.query) {
        lowerCaseQuery[queryKey.toLowerCase()] = req.query[queryKey];
      }

      if (lowerCaseQuery.hasOwnProperty(key)) {
        const items = await findId(
          lowerCaseQuery,
          append_to_response,
          filtered_seasons_query,
        );
        const results = items.results;
        const total_results = items.total_results;

        json = {
          page: 1,
          results,
          total_pages: 1,
          total_results,
        };

        break;
      }
    }

    await sendRequest(
      req,
      res,
      json,
      item_type_query,
      limit,
      config,
      is_active_item,
    );
  } catch (error) {
    await sendInternalError(res, error);
  }
};

module.exports = getItems;
