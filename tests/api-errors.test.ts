require("dotenv").config();

const axios = require("axios");

const { client, collectionData } = require("../src/utils/mongoClient");
const { config } = require("../src/config");
const {
  getInvalidSortOrderMessage,
} = require("./utils/getInvalidSortOrderMessage");
const { handleRequestError } = require("../src/utils/sendRequest");
const { limiter } = require("../src/routes/utils/rateLimiter");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const maxLimitLargeDocuments = config.maxLimitLargeDocuments;

/**
 * Request cases and their expected results.
 * @type {Record<string, { query: string, method?: string, data?: Buffer, headers?: object, skipRemote?: boolean, expectedResult: (data: any, response: any) => void }>}
 */
const params = {
  uppercase_page_is_not_an_integer: {
    query: "?PAGE=abc",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidPageMessage} Received 'abc'.`,
      });
    },
  },

  duplicate_query_parameter_names: {
    query: "?page=1&PAGE=abc",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: config.invalidQueryValuesMessage,
      });
    },
  },

  duplicate_lookup_parameter_names: {
    query: "?tmdbid=550&tmdbId=1396",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: config.invalidQueryValuesMessage,
      });
    },
  },

  duplicate_api_key_parameter_names: {
    query: "?API_KEY=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: config.invalidQueryValuesMessage,
      });
    },
  },

  repeated_query_parameter_names: {
    query: "?page=1&page=2",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: config.invalidQueryValuesMessage,
      });
    },
  },

  query_parameter_values_preserve_casing: {
    query: "?ITEM_TYPE=moviE",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidItemTypeMessage} Received 'moviE'.`,
      });
    },
  },

  is_active_is_invalid: {
    query: "?is_active=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidBooleanMessage} Received 'invalid' for 'is_active'.`,
      });
    },
  },

  is_active_has_duplicate_values: {
    query: "?is_active=true,true",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidBooleanMessage} Received 'true,true' for 'is_active'.`,
      });
    },
  },

  item_type_has_duplicate_values: {
    query: "?item_type=movie,movie",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidItemTypeMessage} Received 'movie,movie'.`,
      });
    },
  },

  item_type_is_empty: {
    query: "?item_type=",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidItemTypeMessage} Received ''.`,
      });
    },
  },

  status_has_duplicate_values: {
    query: "?status=ended,ended",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidStatusMessage} Received 'ended,ended'.`,
      });
    },
  },

  status_is_empty: {
    query: "?status=",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidStatusMessage} Received ''.`,
      });
    },
  },

  append_to_response_is_invalid: {
    query: "?append_to_response=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidAppendToResponseMessage} Received 'invalid'.`,
      });
    },
  },

  popularity_filters_is_invalid: {
    query: "?item_type=tvshow&popularity_filters=wrong_value",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidPopularityFiltersMessage} Received 'wrong_value'.`,
      });
    },
  },

  seasons_append_to_response_is_invalid: {
    query: "/tvshow/1396/seasons?append_to_response=awards",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidSeasonAppendToResponseMessage} Received 'awards'.`,
      });
    },
  },

  rated_episodes_minimum_ratings_exceeds_maximum: {
    query: "/episodes/rated?minimum_ratings=11",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsRangeMessage.replace(
          "{maximum}",
          10,
        )} Received '11'.`,
      });
    },
  },

  rated_episodes_order_has_multiple_values: {
    query: "/episodes/rated?order=asc,desc",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("order", "asc,desc"),
      });
    },
  },

  top_ranking_order_has_multiple_values: {
    query: "?top_ranking_order=asc,desc",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("top_ranking_order", "asc,desc"),
      });
    },
  },

  top_ranking_order_is_invalid: {
    query: "?top_ranking_order=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("top_ranking_order", "invalid"),
      });
    },
  },

  mojo_rank_order_has_multiple_values: {
    query: "?mojo_rank_order=asc,desc",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("mojo_rank_order", "asc,desc"),
      });
    },
  },

  mojo_rank_order_is_invalid: {
    query: "?mojo_rank_order=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("mojo_rank_order", "invalid"),
      });
    },
  },

  request_body_is_invalid_json: {
    query: "/mcp?",
    method: "post",
    data: Buffer.from('{"private_value":'),
    headers: { "Content-Type": "application/json" },
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: config.invalidRequestMessage,
      });
    },
  },

  request_body_is_too_large: {
    query: "/mcp?",
    method: "post",
    data: Buffer.from(JSON.stringify({ value: "a".repeat(102400) })),
    headers: { "Content-Type": "application/json" },
    expectedResult: (data, response) => {
      expect(response.status).toBe(413);
      expect(data).toEqual({
        code: 413,
        message: config.invalidRequestMessage,
      });
    },
  },

  request_encoding_is_unsupported: {
    query: "/mcp?",
    method: "post",
    data: Buffer.from("{}"),
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "invalid",
    },
    expectedResult: (data, response) => {
      expect(response.status).toBe(415);
      expect(data).toEqual({
        code: 415,
        message: config.invalidRequestMessage,
      });
    },
  },

  path_encoding_is_invalid: {
    query: "/movie/%E0%A4?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: config.invalidRequestMessage,
      });
    },
  },

  item_type_is_invalid: {
    query: "?item_type=movies",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidItemTypeMessage} Received 'movies'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  non_string_query_parameter_present: {
    query: "?item_type[$ne]=movie",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.invalidQueryValuesMessage);
      expect(data.code).toBe(400);
    },
  },

  item_type_is_not_lowercase: {
    query: "?item_type=moviE",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidItemTypeMessage} Received 'moviE'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  limit_exceeds_maximum: {
    query: `?item_type=tvshow&is_active=true,false&limit=${parseInt(config.maxLimit) + 1}`,
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `Invalid limit provided. Please specify an integer between 1 and ${config.maxLimit}. Received '${parseInt(config.maxLimit) + 1}'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  query_parameter_is_unsupported: {
    query: "?invalid_value=invalid_value&is_active",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  percent_sign_genre_filter_has_no_matches: {
    query: "?genres=%25",
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toContain(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
      expect(response.status).toBe(404);
    },
  },

  mongo_memory_limit_error_message: {
    query: `?page=4000`,
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.queryMemoryLimitMessage);
      expect(data.code).toBe(500);
      expect(response.status).toBe(500);
    },
  },

  no_items_found_on_page_3: {
    query:
      "?item_type=tvshow&is_active=true&seasons_number=1,2&page=3&limit=200",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  ratings_filters_is_invalid: {
    query: "?ratings_filters=wrong_values",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidRatingsFiltersMessage} Received 'wrong_values'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  no_items_found_on_a_blank_title_search: {
    query: "?title=",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  unknown_tvshow_on_seasons_path: {
    query: "/tvshow/999999999/seasons?",
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
      expect(response.status).toBe(404);
    },
  },

  invalid_tvshow_season_number_on_episodes_path: {
    query: "/tvshow/1396/seasons/0/episodes?",
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
      expect(response.status).toBe(404);
    },
  },

  unknown_tvshow_episode_on_episode_details_path: {
    query: "/tvshow/1396/seasons/1/episodes/999999?",
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
      expect(response.status).toBe(404);
    },
  },

  movie_id_is_undefined_string: {
    query: "/movie/undefined?",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  unknown_tvshow_id_with_ratings_filters: {
    query: "/tvshow/999999999?ratings_filters=all",
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
      expect(response.status).toBe(404);
    },
  },

  no_items_found_for_invalid_query: {
    query: "?title=some invalid value to be tested",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  invalid_item_type_with_unmatched_title: {
    query: "?item_type=movies&title=some invalid value to be tested",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidItemTypeMessage} Received 'movies'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  search_item_type_is_invalid: {
    query: "?item_type=movies&title=wolf",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidItemTypeMessage} Received 'movies'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  release_date_inverted_range_should_return_error: {
    query:
      "?item_type=movie,tvshow&is_active=true,false&release_date=from:2025-01-01,to:2010-01-01",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  minimum_ratings_is_invalid: {
    query:
      "?item_type=tvshow&popularity_filters=none&minimum_ratings=some invalid value to be tested",
    expectedResult: (data) => {
      expect(data.code).toBe(400);
      expect(data.message).toBe(
        `${config.invalidMinimumRatingsMessage} Received 'some invalid value to be tested'.`,
      );
    },
  },

  minimum_ratings_exceeds_maximum: {
    query: "?item_type=movie,tvshow&is_active=true,false&minimum_ratings=9,9",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidMinimumRatingsRangeMessage.replace(
          "{maximum}",
          5,
        )} Received '9,9'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  minimum_ratings_is_negative: {
    query: "?minimum_ratings=-1",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsRangeMessage.replace(
          "{maximum}",
          5,
        )} Received '-1'.`,
      });
    },
  },

  rated_episodes_minimum_users_rating_count_has_no_matches: {
    query: "/episodes/rated?minimum_users_rating_count=999999999",
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
      expect(response.status).toBe(404);
    },
  },

  should_not_return_directors_values: {
    query: `?item_type=tvshow&is_active=true,false&directors=wrong_value`,
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  should_not_return_any_items_on_wrong_genres_and_platforms: {
    query:
      "?item_type=tvshow&is_active=true,false&genres=wrong_value&platforms=wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  should_return_not_found_preferences: {
    query:
      "/preferences/email@example_not_found.com?digest=744cc19085112f8c8b8c9745c5861cf6f95cda7e9b0f424f79e6ee5c7c830344",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("Preferences not found for the given email.");
      expect(data.code).toBe(404);
    },
  },

  should_return_unauthorized_access_if_invalid_digest: {
    query: "/preferences/email@example.com?digest=wrong_digest_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Unauthorized access: The provided digest is invalid.",
      );
      expect(data.code).toBe(401);
    },
  },

  should_return_unauthorized_access_if_no_digest: {
    query: "/preferences/email@example.com?is_active",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Unauthorized access: The provided digest is invalid.",
      );
      expect(data.code).toBe(401);
    },
  },

  should_return_user_preferences: {
    query:
      "/preferences/email@example.com?digest=5a7f9c5cf06afb1efd1d7a276d52ddd3a2b7269d413a3ffd1bad8b85dd305215",
    expectedResult: (data, response) => {
      expect(data).toHaveProperty("email");
      expect(response.status).toBe(200);
    },
  },

  invalid_path: {
    query: "/invalid-path?is_active",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidEndpointMessage} Allowed endpoints are: GET /, GET /episodes/rated, GET /movie/:id, GET /tvshow/:id, GET /tvshow/:id/seasons, GET /tvshow/:id/seasons/:season_number/episodes, GET /tvshow/:id/seasons/:season_number/episodes/:episode_number, GET /updates. Received '/invalid-path'.`,
      );
      expect(data.code).toBe(404);
    },
  },

  limit_is_zero: {
    query: "?item_type=movie,tvshow&limit=0",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `Invalid limit provided. Please specify an integer between 1 and ${config.maxLimit}. Received '0'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  limit_is_negative: {
    query: "?item_type=movie,tvshow&limit=-5",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `Invalid limit provided. Please specify an integer between 1 and ${config.maxLimit}. Received '-5'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  limit_is_decimal: {
    query: "?item_type=movie,tvshow&limit=10.5",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `Invalid limit provided. Please specify an integer between 1 and ${config.maxLimit}. Received '10.5'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  limit_is_not_a_number: {
    query: "?item_type=movie,tvshow&limit=abc",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `Invalid limit provided. Please specify an integer between 1 and ${config.maxLimit}. Received 'abc'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  page_is_not_an_integer: {
    query: "?item_type=movie,tvshow&page=1.5",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(`${config.invalidPageMessage} Received '1.5'.`);
      expect(data.code).toBe(400);
    },
  },

  page_is_zero: {
    query: "?item_type=movie,tvshow&page=0",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(`${config.invalidPageMessage} Received '0'.`);
      expect(data.code).toBe(400);
    },
  },

  page_is_negative: {
    query: "?item_type=movie,tvshow&page=-5",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(`${config.invalidPageMessage} Received '-5'.`);
      expect(data.code).toBe(400);
    },
  },

  page_is_not_a_number: {
    query: "?item_type=movie,tvshow&page=abc",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(`${config.invalidPageMessage} Received 'abc'.`);
      expect(data.code).toBe(400);
    },
  },

  rated_episodes_page_is_not_an_integer: {
    query: "/episodes/rated?page=two",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(`${config.invalidPageMessage} Received 'two'.`);
      expect(data.code).toBe(400);
    },
  },

  runtime_is_not_an_integer_list: {
    query: "?item_type=movie&runtime=invalid",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid runtime provided. Please specify only integers greater than or equal to 0. Received 'invalid'.",
      );
      expect(data.code).toBe(400);
    },
  },

  seasons_number_is_not_an_integer_list: {
    query: "?item_type=tvshow&seasons_number=1,wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid seasons_number provided. Please specify only integers greater than or equal to 1. Received '1,wrong_value'.",
      );
      expect(data.code).toBe(400);
    },
  },

  status_is_not_an_allowed_value: {
    query: "?status=%25ended",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidStatusMessage} Received '%ended'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  filtered_seasons_is_not_an_integer_list: {
    query:
      "?item_type=tvshow&append_to_response=episodes_details&filtered_seasons=wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid filtered_seasons provided. Please specify only integers greater than or equal to 1. Received 'wrong_value'.",
      );
      expect(data.code).toBe(400);
    },
  },

  filtered_seasons_search_is_not_an_integer_list: {
    query:
      "?imdbid=tt0903747&append_to_response=episodes_details&filtered_seasons=wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid filtered_seasons provided. Please specify only integers greater than or equal to 1. Received 'wrong_value'.",
      );
      expect(data.code).toBe(400);
    },
  },

  rated_episodes_filtered_seasons_is_not_an_integer_list: {
    query: "/episodes/rated?filtered_seasons=1,wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid filtered_seasons provided. Please specify only integers greater than or equal to 1. Received '1,wrong_value'.",
      );
      expect(data.code).toBe(400);
    },
  },

  rated_episodes_minimum_users_rating_count_is_not_an_integer: {
    query: "/episodes/rated?minimum_users_rating_count=10.5",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid minimum_users_rating_count provided. Please specify an integer greater than or equal to 0. Received '10.5'.",
      );
      expect(data.code).toBe(400);
    },
  },

  rated_episodes_minimum_users_rating_count_is_negative: {
    query: "/episodes/rated?minimum_users_rating_count=-1",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid minimum_users_rating_count provided. Please specify an integer greater than or equal to 0. Received '-1'.",
      );
      expect(data.code).toBe(400);
    },
  },

  no_items_found_with_is_active_error_message: {
    query: "?item_type=movie&directors=some_wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.noMatchingItemsFoundMessage} Ensure 'is_active' is correctly set (currently true,false).`,
      );
      expect(data.code).toBe(404);
    },
  },

  is_active_is_empty: {
    query: "?item_type=movie&directors=some_wrong_value&is_active=",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.invalidBooleanMessage} Received '' for 'is_active'.`,
      );
      expect(data.code).toBe(400);
    },
  },

  imdb_lookup_has_no_match: {
    query: "?imdbId=wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  only_networks_no_matching_production_companies: {
    query: `?item_type=tvshow&networks=${encodeURIComponent("hbo")}&production_companies=${encodeURIComponent("unknown studio")}&is_active=true,false&limit=${maxLimitLargeDocuments}`,
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(config.noMatchingItemsFoundMessage);
      expect(data.code).toBe(404);
    },
  },

  no_critic_certified_items_on_tvshow: {
    query: "?item_type=tvshow&critics_certified=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.noMatchingItemsFoundMessage} Ensure 'is_active' is correctly set (currently true,false).`,
      );
      expect(data.code).toBe(404);
    },
  },

  no_user_certified_items_on_tvshow: {
    query: "?item_type=tvshow&users_certified=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.noMatchingItemsFoundMessage} Ensure 'is_active' is correctly set (currently true,false).`,
      );
      expect(data.code).toBe(404);
    },
  },

  no_user_or_critic_certified_items_on_tvshow: {
    query: "?item_type=tvshow&users_certified=true&critics_certified=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `${config.noMatchingItemsFoundMessage} Ensure 'is_active' is correctly set (currently true,false).`,
      );
      expect(data.code).toBe(404);
    },
  },

  movie_id_has_suffix: {
    query: "/movie/550abc?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  movie_id_is_decimal: {
    query: "/movie/550.5?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  movie_id_is_unsafe: {
    query: "/movie/9007199254740992?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  tvshow_id_has_suffix: {
    query: "/tvshow/1396abc?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  seasons_tvshow_id_is_decimal: {
    query: "/tvshow/1396.5/seasons?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  season_episodes_tvshow_id_has_suffix: {
    query: "/tvshow/1396abc/seasons/1/episodes?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  season_number_has_suffix: {
    query: "/tvshow/1396/seasons/1abc/episodes?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  season_number_is_decimal: {
    query: "/tvshow/1396/seasons/1.5/episodes?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  season_number_is_unsafe: {
    query: "/tvshow/1396/seasons/9007199254740992/episodes?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  episode_details_tvshow_id_has_suffix: {
    query: "/tvshow/1396abc/seasons/1/episodes/1?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  episode_details_season_number_is_decimal: {
    query: "/tvshow/1396/seasons/1.5/episodes/1?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  episode_number_has_suffix: {
    query: "/tvshow/1396/seasons/1/episodes/1abc?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  episode_number_is_decimal: {
    query: "/tvshow/1396/seasons/1/episodes/1.5?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  episode_number_is_unsafe: {
    query: "/tvshow/1396/seasons/1/episodes/9007199254740992?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  episode_number_is_negative: {
    query: "/tvshow/1396/seasons/1/episodes/-1?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  episode_details_season_number_is_zero: {
    query: "/tvshow/1396/seasons/0/episodes/1?",
    expectedResult: (data, response) => {
      expect(response.status).toBe(404);
      expect(data).toEqual({
        code: 404,
        message: config.noMatchingItemsFoundMessage,
      });
    },
  },

  updates_method_is_not_allowed: {
    query: "/updates?",
    method: "post",
    expectedResult: (data, response) => {
      expect(response.status).toBe(405);
      expect(data).toEqual({
        code: 405,
        message: `${config.invalidMethodMessage} Allowed methods are: GET. Received 'POST /updates'.`,
      });
      expect(response.headers.allow).toBe("GET");
    },
  },

  root_has_unsupported_parameter: {
    query: "?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  rated_episodes_has_unsupported_parameter: {
    query: "/episodes/rated?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  movie_has_unsupported_parameter: {
    query: "/movie/550?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  movie_has_unsupported_is_active_parameter: {
    query: "/movie/550?is_active=true",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'is_active'.`,
      });
    },
  },

  movie_has_unsupported_page_parameter: {
    query: "/movie/550?page=2",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'page'.`,
      });
    },
  },

  tvshow_has_unsupported_parameter: {
    query: "/tvshow/1396?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  seasons_has_unsupported_parameter: {
    query: "/tvshow/1396/seasons?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  season_episodes_has_unsupported_parameter: {
    query: "/tvshow/1396/seasons/1/episodes?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  episode_details_has_unsupported_parameter: {
    query: "/tvshow/1396/seasons/1/episodes/1?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  updates_has_unsupported_parameter: {
    query: "/updates?invalid_value=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidQueryParamsMessage} Received 'invalid_value'.`,
      });
    },
  },

  tmdb_id_has_suffix: {
    query: "?tmdbId=550abc",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid tmdbid provided. Please specify an integer greater than or equal to 1. Received '550abc'.",
      });
    },
  },

  tmdb_id_is_decimal: {
    query: "?tmdbid=550.5",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid tmdbid provided. Please specify an integer greater than or equal to 1. Received '550.5'.",
      });
    },
  },

  tmdb_id_is_unsafe: {
    query: "?tmdbid=9007199254740992",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid tmdbid provided. Please specify an integer greater than or equal to 1. Received '9007199254740992'.",
      });
    },
  },

  allocine_id_is_zero: {
    query: "?allocineid=0",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid allocineid provided. Please specify an integer greater than or equal to 1. Received '0'.",
      });
    },
  },

  senscritique_id_is_negative: {
    query: "?senscritiqueid=-1",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid senscritiqueid provided. Please specify an integer greater than or equal to 1. Received '-1'.",
      });
    },
  },

  thetvdb_id_uses_exponent: {
    query: "?thetvdbid=1e3",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid thetvdbid provided. Please specify an integer greater than or equal to 1. Received '1e3'.",
      });
    },
  },

  page_is_unsafe: {
    query: "?page=9007199254740992",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidPageMessage} Received '9007199254740992'.`,
      });
    },
  },

  runtime_contains_unsafe_integer: {
    query: "?runtime=0,9007199254740992",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid runtime provided. Please specify only integers greater than or equal to 0. Received '0,9007199254740992'.",
      });
    },
  },

  seasons_number_contains_unsafe_integer: {
    query: "?seasons_number=1,9007199254740992",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid seasons_number provided. Please specify only integers greater than or equal to 1. Received '1,9007199254740992'.",
      });
    },
  },

  filtered_seasons_contains_unsafe_integer: {
    query: "?filtered_seasons=1,9007199254740992",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid filtered_seasons provided. Please specify only integers greater than or equal to 1. Received '1,9007199254740992'.",
      });
    },
  },

  filtered_seasons_is_empty: {
    query: "?filtered_seasons=",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidIntegerListMinimumMessage
          .replace("{name}", "filtered_seasons")
          .replace("{minimum}", 1)} Received ''.`,
      });
    },
  },

  filtered_seasons_has_trailing_comma: {
    query: "?filtered_seasons=1,",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid filtered_seasons provided. Please specify only integers greater than or equal to 1. Received '1,'.",
      });
    },
  },

  filtered_seasons_contains_blank_entry: {
    query: "?filtered_seasons=1,%20,2",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid filtered_seasons provided. Please specify only integers greater than or equal to 1. Received '1, ,2'.",
      });
    },
  },

  filtered_seasons_contains_decimal: {
    query: "?filtered_seasons=1,2.5",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message:
          "Invalid filtered_seasons provided. Please specify only integers greater than or equal to 1. Received '1,2.5'.",
      });
    },
  },

  release_date_is_empty: {
    query: "?release_date=",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received ''.`,
      });
    },
  },

  release_date_has_no_bound: {
    query: "?release_date=2024-01-01",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received '2024-01-01'.`,
      });
    },
  },

  release_date_is_invalid_leap_day: {
    query: "?release_date=from:2025-02-29",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'from:2025-02-29'.`,
      });
    },
  },

  release_date_has_duplicate_from: {
    query: "?release_date=from:2024-01-01,FROM:2024-02-01",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'from:2024-01-01,FROM:2024-02-01'.`,
      });
    },
  },

  release_date_has_duplicate_to: {
    query: "?release_date=to:2024-01-01,to:2024-02-01",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'to:2024-01-01,to:2024-02-01'.`,
      });
    },
  },

  release_date_has_trailing_comma: {
    query: "?release_date=from:2024-01-01,",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'from:2024-01-01,'.`,
      });
    },
  },

  release_date_has_duplicate_shortcut: {
    query: "?release_date=new,new",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'new,new'.`,
      });
    },
  },

  rated_episodes_release_date_has_invalid_day: {
    query: "/episodes/rated?release_date=from:2024-02-30",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'from:2024-02-30'.`,
      });
    },
  },

  rated_episodes_release_date_has_shortcut: {
    query: "/episodes/rated?release_date=new",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'new'.`,
      });
    },
  },

  season_episodes_release_date_has_invalid_month: {
    query: "/tvshow/1396/seasons/1/episodes?release_date=to:2024-13-01",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'to:2024-13-01'.`,
      });
    },
  },

  season_episodes_release_date_has_shortcut: {
    query: "/tvshow/1396/seasons/1/episodes?release_date=everything",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidReleaseDateMessage} Received 'everything'.`,
      });
    },
  },

  minimum_ratings_is_empty: {
    query: "?minimum_ratings=",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsMessage} Received ''.`,
      });
    },
  },

  minimum_ratings_has_trailing_comma: {
    query: "?minimum_ratings=3,",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsMessage} Received '3,'.`,
      });
    },
  },

  minimum_ratings_contains_invalid_entry: {
    query: "?minimum_ratings=3,invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsMessage} Received '3,invalid'.`,
      });
    },
  },

  minimum_ratings_is_hexadecimal: {
    query: "?minimum_ratings=0x10",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsMessage} Received '0x10'.`,
      });
    },
  },

  minimum_ratings_is_non_finite: {
    query: `?minimum_ratings=${"9".repeat(309)}`,
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsMessage} Received '${"9".repeat(309)}'.`,
      });
    },
  },

  rated_episodes_minimum_ratings_is_nan: {
    query: "/episodes/rated?minimum_ratings=NaN",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsMessage} Received 'NaN'.`,
      });
    },
  },

  season_episodes_minimum_ratings_is_infinite: {
    query: "/tvshow/1396/seasons/1/episodes?minimum_ratings=Infinity",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidMinimumRatingsMessage} Received 'Infinity'.`,
      });
    },
  },

  rated_episodes_order_is_empty: {
    query: "/episodes/rated?order=",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("order", ""),
      });
    },
  },

  rated_episodes_order_is_uppercase: {
    query: "/episodes/rated?order=ASC",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("order", "ASC"),
      });
    },
  },

  rated_episodes_order_is_invalid: {
    query: "/episodes/rated?order=invalid",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: getInvalidSortOrderMessage("order", "invalid"),
      });
    },
  },

  updates_since_has_invalid_leap_day: {
    query: "/updates?since=2025-02-29",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidSinceMessage} Received '2025-02-29'.`,
      });
    },
  },

  updates_since_has_invalid_day: {
    query: "/updates?since=2024-02-30T00:00:00.000Z",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidSinceMessage} Received '2024-02-30T00:00:00.000Z'.`,
      });
    },
  },

  updates_since_has_missing_timezone: {
    query: "/updates?since=2024-01-01T00:00:00",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidSinceMessage} Received '2024-01-01T00:00:00'.`,
      });
    },
  },

  updates_since_has_invalid_hour: {
    query: "/updates?since=2024-01-01T24:00:00Z",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidSinceMessage} Received '2024-01-01T24:00:00Z'.`,
      });
    },
  },

  updates_since_has_invalid_offset: {
    query: "/updates?since=2024-01-01T00:00:00%2B25:00",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidSinceMessage} Received '2024-01-01T00:00:00+25:00'.`,
      });
    },
  },

  updates_since_has_non_iso_format: {
    query: "/updates?since=01/02/2024",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidSinceMessage} Received '01/02/2024'.`,
      });
    },
  },

  updates_item_type_has_invalid_last: {
    query: "/updates?since=2024-01-01&item_type=movie,person",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidItemTypeMessage} Received 'movie,person'.`,
      });
    },
  },

  updates_item_type_has_invalid_first: {
    query: "/updates?since=2024-01-01&item_type=person,tvshow",
    expectedResult: (data, response) => {
      expect(response.status).toBe(400);
      expect(data).toEqual({
        code: 400,
        message: `${config.invalidItemTypeMessage} Received 'person,tvshow'.`,
      });
    },
  },
};

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API tests", () => {
  console.log(`Testing on ${baseURL}`);

  Object.entries(params).forEach(
    ([
      name,
      {
        query,
        method = "get",
        data: body,
        headers,
        expectedResult,
        skipRemote,
      },
    ]) => {
      async function fetchItemsData() {
        const apiCall = `${baseURL}${query}${query ? "&" : "?"}api_key=${config.internalApiKey}`;

        console.log("Test name:", name);
        console.log(`Calling ${apiCall}`);

        console.time("axiosCallInDataTest");
        const response = await axios.request({
          method,
          url: apiCall,
          data: body,
          headers,
          validateStatus: (status) => status <= 500,
        });
        console.timeEnd("axiosCallInDataTest");

        const data = response.data;

        expectedResult(data, response);
      }

      (isRemoteSource && skipRemote ? test.skip : test)(
        name,
        async () => {
          await fetchItemsData();
        },
        config.timeout,
      );
    },
  );

  test("Known route should reject a disallowed method", async () => {
    const apiCall = `${baseURL}/movie/121?api_key=${config.internalApiKey}`;

    const response = await axios.post(
      apiCall,
      {},
      { validateStatus: (s) => s <= 500 },
    );

    expect(response.status).toBe(405);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("code");
    expect(response.data.code).toBe(405);
    expect(response.headers).toHaveProperty("allow");
    expect(response.headers.allow).toContain("GET");
  });

  test("Missing request identity is rejected", async () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await limiter({ headers: {}, query: {}, socket: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      code: 503,
      message: `We could not process your request due to a connection issue. Please retry or contact me at ${config.contactURL} if it persists.`,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("A query exceeding its time limit is aborted", async () => {
    expect(config.queryMaxTimeMS).toBeGreaterThan(0);

    await expect(
      collectionData
        .aggregate([{ $sortByCount: "$title" }], { maxTimeMS: 1 })
        .toArray(),
    ).rejects.toThrow(/time limit|MaxTimeMSExpired/i);
  });

  test("Unexpected errors return a generic response", async () => {
    const error = new Error("private error details");
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await handleRequestError(error, {}, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: "Something went wrong.",
      });
      expect(next).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  test("Errors after headers are sent are forwarded", () => {
    const error = new Error("private error details");
    const res = { headersSent: true, status: jest.fn(), json: jest.fn() };
    const next = jest.fn();

    handleRequestError(error, {}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await client.close();
  });
});
