const fs = require("fs");
const axios = require("axios");

/**
 * Reads a file and counts the number of lines in it.
 * @param {string} filename - the name of the file to read
 * @returns {number} - the number of lines in the file
 * @throws {Error} - if the file cannot be read
 */
function countLines(filename) {
  const data = fs.readFileSync(filename, "utf8");
  const lines = data.split("\n");

  // Exclude header line
  if (lines.length > 0) {
    lines.shift();
  }

  return lines.length;
}

/**
 * Configuration object for the application.
 * @property {string} baseURL - The base URL for the API requests.
 * @property {number} maxResponseTime - The maximum response time for API requests.
 * @property {number} timeout - The timeout for API requests.
 * @property {string} films_ids_path - The path to the file containing the IDs of films.
 * @property {string} series_ids_path - The path to the file containing the IDs of series.
 * @property {boolean} checkItemsNumber - Whether or not to check the number of items in the response.
 */
const config = {
  baseURL: "http://localhost:8081",
  maxResponseTime: 3000,
  timeout: 500000,

  films_ids_path: "./src/assets/films_ids.txt",
  series_ids_path: "./src/assets/series_ids.txt",

  checkItemsNumber: false,
};

/**
 * An object containing various query parameters and their expected results.
 * @param {object} params - An object containing various query parameters and their expected results.
 * @returns None
 */
const params = {
  default: {
    query: "",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("movie")),
  },

  only_movie: {
    query: "?item_type=movie",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("movie")),
  },

  only_tvshow: {
    query: "?item_type=tvshow",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("tvshow")),
  },

  only_active: {
    query: "?is_active=true",
    expectedResult: (items) => items.every((item) => expect(item.is_active).toBeTruthy),
  },

  only_non_active: {
    query: "?is_active=false",
    expectedResult: (items) => items.every((item) => expect(item.is_active).toBeFalsy),
  },

  only_active_and_non_active: {
    query: "?is_active=true,false",
    expectedResult: (items) => items.every((item) => expect(item.is_active).toBeTruthy || expect(item.is_active).toBeFalsy),
  },

  only_cinema_movie: {
    query: "?cinema_id=B2619&item_type=movie",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("movie")),
  },

  only_season_1_and_2: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item.item_type).toBe("tvshow");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_greater_than_1: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2,5",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item.item_type).toBe("tvshow");
        expect(item.seasons_number).toBeGreaterThanOrEqual(1);
      }),
  },

  only_ongoing_status: {
    query: "?item_type=tvshow&status=ongoing",
    expectedResult: (items) => items.every((item) => expect(item.status).toBe("Ongoing")),
  },

  only_ongoing_and_canceled_status: {
    query: "?item_type=tvshow&status=canceled,soon",
    expectedResult: (items) => items.every((item) => expect(["Canceled" || "Soon"]).toContain(item.status)),
  },

  only_null_status: {
    query: "?status=&limit=200",
    expectedResult: (items) => items.every((item) => expect(item.status).toBe(null)),
  },

  only_ongoing_status_with_1_and_2_seasons: {
    query: "?item_type=tvshow&status=ongoing&seasons_number=1,2",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item.status).toBe("Ongoing");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_20_items_on_page_2: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2&page=2&limit=20&allData=true",
    expectedResult: (data) => {
      expect(data.page).toBe(2);
      expect(data.results.length).toBe(20);
    },
  },

  only_not_found_items_on_page_3: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2&page=3&limit=200&allData=true",
    expectedResult: (data) => {
      expect(data.message).toBe("No items have been found for page 3.");
    },
  },

  only_valid_users_rating: {
    query: "?item_type=tvshow&is_active=true&limit=200",
    expectedResult: (items) =>
      items.every((item) => {
        if (item.allocine && item.allocine.users_rating !== null) {
          expect(item.allocine.users_rating).toBeLessThanOrEqual(5);
        }

        if (item.betaseries !== null) {
          expect(item.betaseries.users_rating).toBeLessThanOrEqual(5);
        }

        if (item.imdb !== null) {
          expect(item.imdb.users_rating).toBeLessThanOrEqual(10);
        }

        if (item.metacritic !== null) {
          expect(item.metacritic.users_rating).toBeLessThanOrEqual(10);
        }
      }),
  },

  only_same_files_line_number_with_remote: {
    query: "?item_type=movie,tvshow&is_active=true,false&allData=true",
    expectedResult: (items) => {
      if (config.checkItemsNumber) {
        const filmsLines = countLines(config.films_ids_path);
        const seriesLines = countLines(config.series_ids_path);

        expect(filmsLines + seriesLines - 2).toEqual(items.total_results);
      }
    },
  },

  only_correct_tmdb_id_returned: {
    query: "/tv/101389&allData=true",
    expectedResult: (data) => {
      expect(data.id).toBe(101389);
    },
  },

  only_20_results_returned_on_a_search: {
    query: "?title=wolf&allData=true",
    expectedResult: (data) => {
      expect(data.page).toBe(1);
      expect(data.results.length).toEqual(data.total_results);
    },
  },

  only_ascending_popularity_average: {
    query: "?item_type=tvshow",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].popularity_average).toBeGreaterThanOrEqual(items[i - 1].popularity_average);
      }
    },
  },
};

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API tests", () => {
  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    test(
      name,
      async () => {
        const response = await axios.get(`${config.baseURL}${query}`);
        const data = response.data;
        const items = data.results;

        if (query.includes("allData=true")) {
          expectedResult(data);
        } else {
          expectedResult(items);
        }
      },
      config.timeout
    );
  });

  test(
    "api_response_time_should_be_within_an_acceptable_range",
    async () => {
      const start = new Date().valueOf();

      await axios.get(`${config.baseURL}`);

      const end = new Date().valueOf();
      const responseTime = end - start;

      const maxResponseTime = config.maxResponseTime;

      expect(responseTime).toBeLessThan(maxResponseTime);
    },
    config.timeout
  );
});
