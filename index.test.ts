/**
 * Loads environment variables from a .env file into process.env.
 * @returns None
 */
require("dotenv").config();

const fs = require("fs");
const axios = require("axios");

const config = require("./src/config").config;
const isLowerCase = require("./src/utils/isLowerCase");

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
 * An object containing various query parameters and their expected results.
 * @param {object} params - An object containing various query parameters and their expected results.
 * @returns None
 */
const params = {
  default: {
    query: "",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_movie: {
    query: "?item_type=movie",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_tvshow: {
    query: "?item_type=tvshow",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
      }),
  },

  only_active: {
    query: "?is_active=true",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeTruthy();
      }),
  },

  only_non_active: {
    query: "?is_active=false",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeFalsy();
      }),
  },

  only_active_and_non_active: {
    query: "?is_active=true,false",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active === true || item.is_active === false).toBeTruthy();
      }),
  },

  only_cinema_movie: {
    query: "?cinema_id=C0159&item_type=movie",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_season_1_and_2: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_greater_than_1: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2,5",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeGreaterThanOrEqual(1);
      }),
  },

  only_ongoing_status: {
    query: "?item_type=tvshow&status=ongoing",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item.status).not.toBeNull();
      }),
  },

  only_ongoing_and_canceled_status: {
    query: "?item_type=tvshow&status=canceled,soon",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("status");
        expect(["Canceled", "Soon"]).toContain(item.status);
      }),
  },

  only_null_status: {
    query: "?status=&limit=200",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe(null);
      }),
  },

  only_ongoing_status_with_1_and_2_seasons: {
    query: "?item_type=tvshow&status=ongoing&seasons_number=1,2",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_20_items_on_page_2: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2&page=2&limit=20&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(2);
      expect(data.results.length).toBe(20);
    },
  },

  only_not_found_items_on_page_3: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2&page=3&limit=200&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data.message).toBe("No items have been found for page 3.");
    },
  },

  only_valid_users_rating: {
    query: "?item_type=tvshow&is_active=true&limit=200",
    expectedResult: (items) =>
      items.every((item) => {
        if (item.allocine && item.allocine.users_rating !== null) {
          expect(item.allocine.users_rating).toBeGreaterThanOrEqual(0);
          expect(item.allocine.users_rating).toBeLessThanOrEqual(5);
        }

        if (item.betaseries !== null) {
          expect(item.betaseries.users_rating).toBeGreaterThanOrEqual(0);
          expect(item.betaseries.users_rating).toBeLessThanOrEqual(5);
        }

        if (item.imdb !== null) {
          expect(item.imdb.users_rating).toBeGreaterThanOrEqual(0);
          expect(item.imdb.users_rating).toBeLessThanOrEqual(10);
        }

        if (item.metacritic !== null) {
          expect(item.metacritic.users_rating).toBeGreaterThanOrEqual(0);
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
      expect(typeof data).toBe("object");
      expect(data.id).toBe(101389);
    },
  },

  only_20_results_returned_on_a_search: {
    query: "?title=wolf&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(1);
      expect(data.results.length).toEqual(data.total_results);
    },
  },

  only_titles_with_game_returned_on_a_search: {
    query: "?title=game",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item.title.toLowerCase()).toContain("game");
      }),
  },

  only_not_found_items_returned: {
    query: "?title=some invalid value to be tested&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data.message).toBe("No items have been found.");
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

  only_items_with_all_required_keys: {
    query: "",
    expectedResult: (items) =>
      items.every((item) => {
        config.keysToCheck.forEach((key) => {
          expect(item).toHaveProperty(key);
          expect(typeof item[key]).not.toBe("undefined");
          expect(isLowerCase(key)).toBe(true);

          expect(Object.keys(item.allocine)).toHaveLength(7);
          expect(items.filter((item) => item.allocine.users_rating !== null && item.allocine.users_rating !== undefined).length).toBeGreaterThanOrEqual(5);

          expect(Object.keys(item.imdb)).toHaveLength(4);
          expect(items.filter((item) => item.imdb.users_rating !== null && item.imdb.users_rating !== undefined).length).toBeGreaterThanOrEqual(5);

          expect(Object.keys(item.betaseries)).toHaveLength(3);
          expect(items.filter((item) => item.betaseries.users_rating !== null && item.betaseries.users_rating !== undefined).length).toBeGreaterThanOrEqual(5);

          expect(Object.keys(item.metacritic)).toHaveLength(6);
          expect(items.filter((item) => item.metacritic !== null && item.metacritic.users_rating !== null && item.metacritic.users_rating !== undefined).length).toBeGreaterThanOrEqual(1);

          expect(item.title).not.toBeNull();
          expect(item.image).not.toBeNull();
        });
      }),
  },
};

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API tests", () => {
  const param = process.env.SOURCE;
  const baseURL = param === "remote" ? config.baseURLRemote : config.baseURL;
  console.log(`Testing on ${baseURL}.`);

  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    test(
      name,
      async () => {
        const response = await axios.get(`${baseURL}${query}`);
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

      await axios.get(`${baseURL}`);

      const end = new Date().valueOf();
      const responseTime = end - start;

      const maxResponseTime = config.maxResponseTime;

      expect(responseTime).toBeLessThan(maxResponseTime);
    },
    config.timeout
  );
});
