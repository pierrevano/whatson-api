const { aggregateData } = require("./aggregateData");
const { config } = require("../config");
const {
  sendInternalError,
  sendRequest,
  sendResponse,
} = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const { validateIntegerListParam } = require("./utils/queryValidationMessages");
const {
  validateItemTypeQuery,
  validateSharedQueryParams,
} = require("./utils/queryParamsValidation");
const findId = require("./findId");
const getInternalApiKey = require("./getInternalApiKey");

/**
 * Handles the public `/` endpoint by translating query parameters into a Mongo aggregation
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
    const limit_raw = req.query.limit;
    const limit_provided = typeof limit_raw !== "undefined";

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
      top_ranking_order: top_ranking_order_query,
      mojo_rank_order: mojo_rank_order_query,
      seasons_number: seasons_number_query,
      status: status_query,
      users_certified: is_users_certified_query,
    } = req.query;

    const item_type_error = validateItemTypeQuery(item_type_query);
    if (item_type_error) {
      return sendResponse(res, 400, {
        message: item_type_error,
      });
    }

    const shared_query_params_error = validateSharedQueryParams(
      req.query,
      config,
    );
    if (shared_query_params_error) {
      return sendResponse(res, 400, {
        message: shared_query_params_error,
      });
    }

    const runtime_error = validateIntegerListParam(runtime_query, "runtime", 0);
    if (runtime_error) {
      return sendResponse(res, 400, {
        message: runtime_error,
      });
    }

    const seasons_number_error = validateIntegerListParam(
      seasons_number_query,
      "seasons_number",
    );
    if (seasons_number_error) {
      return sendResponse(res, 400, {
        message: seasons_number_error,
      });
    }

    const parsed_limit = Number(limit_raw);
    const limit_query = limit_provided ? parsed_limit : undefined;
    const page_query = Number(req.query.page);

    const internal_api_key = await getInternalApiKey();

    const newRelicQueryAttributes = {
      ...req.query,
      new_relic_route: "getItems",
    };

    sendToNewRelic(
      req,
      api_key_query,
      internal_api_key,
      newRelicQueryAttributes,
    );

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
      top_ranking_order_query,
      mojo_rank_order_query,
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

    await sendRequest(req, res, json, config, is_active_item);
  } catch (error) {
    await sendInternalError(res, error);
  }
};

module.exports = getItems;
