const { aggregateData } = require("./aggregateData");
const { config } = require("../config");
const { sendInternalError, sendRequest } = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const findId = require("./findId");
const getInternalApiKey = require("./getInternalApiKey");

/**
 * Returns matching items.
 *
 * @param {import("express").Request} req - Express request containing filters and pagination options.
 * @param {import("express").Response} res - Express response used to return JSON payloads or errors.
 * @returns {Promise<import("express").Response|void>} Resolves once the response has been sent.
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
      composers: composers_query,
      directors: directors_query,
      filtered_seasons: filtered_seasons_query,
      genres: genres_query,
      runtime: runtime_query,
      item_type: item_type_query,
      minimum_ratings: minimum_ratings_query,
      networks: networks_query,
      order: order_query,
      platforms: platforms_query,
      popularity_filters: popularity_filters_query,
      production_companies: production_companies_query,
      ratings_filters: ratings_filters_query,
      release_date: release_date_query,
      sort_by: sort_by_query,
      seasons_number: seasons_number_query,
      status: status_query,
    } = req.query;

    const boolean_query = Object.fromEntries(
      config.booleanQueryFields
        .map((field) => field.split(".").pop())
        .map((name) => [name, req.query[name]]),
    );

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

    if (
      config.keysToCheckForSearch.some((key) => Object.hasOwn(req.query, key))
    ) {
      const { limit, page, results, total_results } = await findId(
        req.query,
        append_to_response,
        filtered_seasons_query,
      );
      return sendRequest(
        req,
        res,
        {
          page,
          results,
          total_pages: Math.ceil(total_results / limit),
          total_results,
        },
        config,
      );
    }

    const { items, limit, page, is_active_item } = await aggregateData(
      append_to_response,
      composers_query,
      directors_query,
      genres_query,
      networks_query,
      production_companies_query,
      id_path,
      boolean_query,
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
      order_query,
      sort_by_query,
    );
    const results = items && items.length > 0 ? items[0].results : [];
    const total_results =
      results.length > 0 ? items[0].total_results[0].total_results : 0;

    const json = {
      page,
      results,
      total_pages: Math.ceil(total_results / limit),
      total_results,
    };

    await sendRequest(req, res, json, config, is_active_item);
  } catch (error) {
    await sendInternalError(res, error);
  }
};

module.exports = getItems;
