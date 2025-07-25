require("dotenv").config();

const axios = require("axios");

const { config } = require("../src/config");
const { countLines } = require("./utils/countLines");
const { generateRandomIp } = require("./utils/generateRandomIp");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;

/**
 * An object containing various query parameters and their expected results.
 * @param {object} params - An object containing various query parameters and their expected results.
 * @returns None
 */
const params = {
  wrong_item_type_present: {
    query: "?item_type=movies",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid item type provided. Please specify 'movie', 'tvshow', or a combination like 'movie,tvshow'.",
      );
      expect(data.code).toBe(404);
    },
  },

  not_lowercase_item_type_present: {
    query: "?item_type=moviE",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "Invalid item type provided. Please specify 'movie', 'tvshow', or a combination like 'movie,tvshow'.",
      );
      expect(data.code).toBe(404);
    },
  },

  limit_is_higher_than_max_mongodb_items_limit: {
    query: `?item_type=tvshow&is_active=true,false&limit=${parseInt(config.maxLimit) + 1}`,
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        `Limit exceeds maximum allowed (${config.maxLimit}). Please reduce the limit.`,
      );
      expect(data.code).toBe(400);
    },
  },

  wrong_query_parameter: {
    query: "?invalid_value=invalid_value&is_active",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("Invalid query parameter(s): invalid_value");
      expect(data.code).toBe(400);
    },
  },

  page_2_with_20_items: {
    query: "?item_type=tvshow&seasons_number=1,2&page=2&limit=20",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data).toHaveProperty("total_pages");
      expect(data.page).toBe(2);
      expect(data.results.length).toBe(20);
    },
  },

  higher_total_results_than_results: {
    query: "?item_type=movie,tvshow&is_active=true,false&limit=500",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(1);
      expect(data.total_results).toBeGreaterThan(data.results.length);
    },
  },

  no_items_found_on_page_3: {
    query:
      "?item_type=tvshow&is_active=true&seasons_number=1,2&page=3&limit=200",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },

  no_items_found_when_providing_wrong_popularity_and_ratings: {
    query:
      "?item_type=movie&is_active=true,false&popularity_filters=&ratings_filters=wrong_values",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },

  same_files_line_number_as_remote: {
    query: "?item_type=movie,tvshow&is_active=true,false",
    expectedResult: (items) => {
      if (config.checkItemsNumber) {
        const filmsLines = countLines(config.filmsIdsFilePath);
        const seriesLines = countLines(config.seriesIdsFilePath);

        expect(filmsLines + seriesLines + config.margin).toBeGreaterThanOrEqual(
          items.total_results,
        );
      }
    },
  },

  correct_tmdb_id_returned: {
    query:
      "/tvshow/249042?ratings_filters=all&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.id).toBe(249042);
      expect(data.ratings_average).toBeGreaterThan(0);

      expect(Array.isArray(data.allocine.critics_rating_details)).toBeTruthy();
      expect(Array.isArray(data.episodes_details)).toBeTruthy();
      expect(typeof data.last_episode).toBe("object");
      expect(typeof data.highest_episode).toBe("object");
      expect(typeof data.lowest_episode).toBe("object");
    },
  },

  correct_tmdb_id_returned_without_critics_rating_details: {
    query:
      "/tvshow/249042?ratings_filters=all&append_to_response=episodes_details",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.id).toBe(249042);
      expect(data.ratings_average).toBeGreaterThan(0);

      expect(
        Array.isArray(data.allocine.critics_rating_details),
      ).not.toBeTruthy();
      expect(Array.isArray(data.episodes_details)).toBeTruthy();
    },
  },

  correct_tmdb_id_returned_without_episodes_details: {
    query:
      "/tvshow/249042?ratings_filters=all&append_to_response=critics_rating_details",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.id).toBe(249042);
      expect(data.ratings_average).toBeGreaterThan(0);

      expect(Array.isArray(data.allocine.critics_rating_details)).toBeTruthy();
      expect(Array.isArray(data.episodes_details)).not.toBeTruthy();
    },
  },

  correct_tmdb_id_returned_without_critics_rating_details_and_episodes_details:
    {
      query: "/tvshow/249042?ratings_filters=all",
      expectedResult: (data) => {
        expect(typeof data).toBe("object");
        expect(Object.keys(data).length).toEqual(config.keysToCheck.length - 5);
        expect(data.id).toBe(249042);
        expect(data.ratings_average).toBeGreaterThan(0);

        expect(data.allocine).not.toHaveProperty("critics_rating_details");
        expect(data).not.toHaveProperty("episodes_details");
        expect(data).not.toHaveProperty("last_episode");
        expect(data).not.toHaveProperty("next_episode");
        expect(data).not.toHaveProperty("highest_episode");
        expect(data).not.toHaveProperty("lowest_episode");
      },
    },

  correct_tvshow_item_type_returned: {
    query: "/tvshow/121?is_active",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.item_type).toBe("tvshow");
    },
  },

  correct_movie_item_type_returned: {
    query: "/movie/121?is_active",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.item_type).toBe("movie");
    },
  },

  correct_data_to_null_returned_if_undefined: {
    query: "/movie/undefined?is_active",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },

  results_count_on_search: {
    query: "?title=wolf",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(1);
      expect(data.results.length).toEqual(data.total_results);
    },
  },

  no_items_found_for_invalid_query: {
    query: "?title=some invalid value to be tested",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },

  no_items_found_for_invalid_query_and_wrong_item_type_present: {
    query: "?item_type=movies&title=some invalid value to be tested",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },

  should_not_return_directors_values: {
    query: `?item_type=tvshow&is_active=true,false&directors=wrong_value`,
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },

  should_not_return_any_items_on_wrong_genres_and_platforms: {
    query:
      "?item_type=tvshow&is_active=true,false&genres=wrong_value&platforms=wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
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
      expect(data.code).toBe(403);
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
      expect(data.code).toBe(403);
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
        `Invalid endpoint: /invalid-path?is_active&api_key=${config.internalApiKey}. Allowed endpoints are: '/', '/movie/:id', '/tvshow/:id'.`,
      );
      expect(data.code).toBe(500);
    },
  },

  limit_is_zero: {
    query: "?item_type=movie,tvshow&limit=0",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("the limit must be positive");
      expect(data.code).toBe(500);
    },
  },

  no_items_found_with_is_active_error_message: {
    query: "?item_type=movie&directors=some_wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "No matching items found. Ensure 'is_active' is correctly set (currently true).",
      );
      expect(data.code).toBe(404);
    },
  },

  no_items_found_with_is_active_error_message_and_empty_value: {
    query: "?item_type=movie&directors=some_wrong_value&is_active=",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe(
        "No matching items found. Ensure 'is_active' is correctly set (currently true).",
      );
      expect(data.code).toBe(404);
    },
  },

  invalid_imdbId_should_return_404: {
    query: "?imdbId=wrong_value",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },

  only_networks_no_matching_production_companies: {
    query: `?item_type=tvshow&networks=${encodeURIComponent("hbo")}&production_companies=${encodeURIComponent("unknown studio")}&is_active=true,false&limit=900`,
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(data.message).toBe("No matching items found.");
      expect(data.code).toBe(404);
    },
  },
};

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API tests", () => {
  console.log(`Testing on ${baseURL}`);

  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    async function fetchItemsData() {
      const apiCall = `${baseURL}${query}${query ? "&" : "?"}api_key=${config.internalApiKey}`;

      console.log("Test name:", name);
      console.log(`Calling ${apiCall}`);

      console.time("axiosCallInDataTest");
      const response = await axios.get(apiCall, {
        validateStatus: (status) => status <= 500,
      });
      console.timeEnd("axiosCallInDataTest");

      const data = response.data;

      expectedResult(data, response);
    }

    test(
      name,
      async () => {
        await fetchItemsData();
      },
      config.timeout,
    );
  });

  test("Rate Limiting should apply headers on successful requests", async () => {
    // Send 1 request without API key
    const responses = await Promise.all(
      Array.from({ length: 1 }).map(() =>
        axios.get(baseURL, {
          headers: {
            "X-Forwarded-For": generateRandomIp(),
          },
          validateStatus: (status) => status < 500,
        }),
      ),
    );

    const successfulResponse = responses.find(
      (response) => response.status === 200,
    );

    expect(successfulResponse).toBeDefined();
    expect(successfulResponse.headers).toHaveProperty("x-ratelimit-limit");
    expect(successfulResponse.headers).toHaveProperty("x-ratelimit-remaining");
    expect(successfulResponse.headers).not.toHaveProperty("retry-after");
  });

  (isRemoteSource ? test.skip : test)(
    "Rate Limiting should return 429 when limits are exceeded",
    async () => {
      // Send enough requests to potentially reach the limit
      const responses = await Promise.all(
        Array.from({ length: config.points + 1 }).map(() =>
          axios.get(baseURL, { validateStatus: (status) => status < 500 }),
        ),
      );

      const limitedResponse = responses.find(
        (response) => response.status === 429,
      );

      expect(limitedResponse).toBeDefined();
      expect(limitedResponse.headers).not.toHaveProperty("x-ratelimit-limit");
      expect(limitedResponse.headers).not.toHaveProperty(
        "x-ratelimit-remaining",
      );
      expect(limitedResponse.headers).toHaveProperty("retry-after");

      const retryAfter = parseInt(limitedResponse.headers["retry-after"], 10);
      expect(retryAfter).toBeGreaterThan(0);
    },
    config.timeout,
  );
});
