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

function checkItemProperties(items) {
  return items.forEach((item) => {
    item.is_active === true ? expect(Object.keys(item).length).toEqual(config.keysToCheck.length) : null;

    config.keysToCheck.forEach((key) => {
      item.is_active === true ? expect(item).toHaveProperty(key) : null;
      item.is_active === true ? expect(typeof item[key]).not.toBe("undefined") : null;
    });

    const minimumNumberOfItems = 15;

    expect(items.filter((item) => item.is_active).length).toBeLessThanOrEqual(370);

    expect(Object.keys(item.allocine)).toHaveLength(7);
    expect(items.filter((item) => item.allocine.users_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);
    expect(items.filter((item) => item.allocine.critics_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);
    expect(items.filter((item) => item.allocine.critics_number).length).toBeGreaterThanOrEqual(minimumNumberOfItems);
    expect(items.filter((item) => item.allocine.critics_rating_details).length).toBeGreaterThanOrEqual(minimumNumberOfItems);

    expect(Object.keys(item.imdb)).toHaveLength(4);
    expect(items.filter((item) => item.imdb.users_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);

    item.betaseries ? expect(Object.keys(item.betaseries)).toHaveLength(3) : null;
    expect(items.filter((item) => item.betaseries && item.betaseries.users_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);

    item.is_active === true && item.metacritic ? expect(Object.keys(item.metacritic)).toHaveLength(4) : null;
    expect(items.filter((item) => item.metacritic && item.metacritic.users_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);
    expect(items.filter((item) => item.metacritic && item.metacritic.critics_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);

    item.rotten_tomatoes ? expect(Object.keys(item.rotten_tomatoes)).toHaveLength(4) : null;
    expect(items.filter((item) => item.rotten_tomatoes && item.rotten_tomatoes.users_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);
    expect(items.filter((item) => item.rotten_tomatoes && item.rotten_tomatoes.critics_rating).length).toBeGreaterThanOrEqual(minimumNumberOfItems);

    expect(item.title).not.toBeNull();
    expect(item.image).not.toBeNull();
    expect(item.image).toMatch(/\.(jpg|jpeg|png|gif)(\?[a-zA-Z0-9=&]*)?$/i);

    item.platforms_links ? expect(item.platforms_links.filter((link) => link.link_url.startsWith("https")).length).toBe(item.platforms_links.length) : null;
    expect(items.filter((item) => item.platforms_links && item.platforms_links.length > 0).length).toBeGreaterThanOrEqual(minimumNumberOfItems);

    item.trailer ? expect(item.trailer).toMatch(/^https/) : null;
    expect(items.filter((item) => item.trailer).length).toBeGreaterThanOrEqual(minimumNumberOfItems);

    item.is_active === true ? expect(items.filter((item) => item.allocine.popularity).length).toBeGreaterThanOrEqual(minimumNumberOfItems) : null;
    item.is_active === true ? expect(items.filter((item) => item.imdb.popularity).length).toBeGreaterThanOrEqual(minimumNumberOfItems) : null;

    item.is_active === true ? expect(items.filter((item) => item.trailer).length).toBeGreaterThanOrEqual(200) : null;
  });
}

/**
 * An object containing various query parameters and their expected results.
 * @param {object} params - An object containing various query parameters and their expected results.
 * @returns None
 */
const params = {
  default_movies: {
    query: "",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_movies: {
    query: "?item_type=movie",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_tvshows: {
    query: "?item_type=tvshow",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
      }),
  },

  only_active_items: {
    query: "?is_active=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeTruthy();
      }),
  },

  only_non_active_items: {
    query: "?is_active=false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeFalsy();
      }),
  },

  both_movies_and_tvshows: {
    query: "?item_type=movie,tvshow",
    expectedResult: (items) => {
      const movieItems = items.filter((item) => item.item_type === "movie");
      const tvshowItems = items.filter((item) => item.item_type === "tvshow");

      expect(movieItems.length).toBeGreaterThan(0);
      expect(tvshowItems.length).toBeGreaterThan(0);
    },
  },

  both_active_and_non_active_items: {
    query: "?is_active=true,false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active === true || item.is_active === false).toBeTruthy();
      }),
  },

  only_cinema_movies: {
    query: "?cinema_id=C0159&item_type=movie",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_tvshows_with_1_and_2_seasons: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_tvshows_greater_than_1_season: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2,5",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeGreaterThanOrEqual(1);
      }),
  },

  only_ongoing_tvshows: {
    query: "?item_type=tvshow&status=ongoing",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item.status).not.toBeNull();
      }),
  },

  ongoing_and_canceled_tvshows: {
    query: "?item_type=tvshow&status=canceled,soon",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(["Canceled", "Soon"]).toContain(item.status);
      }),
  },

  only_null_status_items: {
    query: "?status=&limit=200",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe(null);
      }),
  },

  custom_limit_value: {
    query: "?limit=5",
    expectedResult: (items) => {
      expect(items.length).toBe(5);
    },
  },

  ongoing_tvshows_with_1_and_2_seasons: {
    query: "?item_type=tvshow&status=ongoing&seasons_number=1,2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  page_2_with_20_items: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2&page=2&limit=20&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(2);
      expect(data.results.length).toBe(20);
    },
  },

  no_items_found_on_page_3: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2&page=3&limit=200&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data.message).toBe("No items have been found for page 3.");
    },
  },

  valid_users_ratings: {
    query: "?item_type=movie,tvshow&is_active=true&limit=400",
    expectedResult: (items) =>
      items.forEach((item) => {
        if (item.allocine) {
          item.allocine.users_rating ? expect(item.allocine.users_rating).toBeGreaterThanOrEqual(0) : null;
          item.allocine.users_rating ? expect(item.allocine.users_rating).toBeLessThanOrEqual(5) : null;

          item.allocine.critics_rating ? expect(item.allocine.critics_rating).toBeGreaterThanOrEqual(0) : null;
          item.allocine.critics_rating ? expect(item.allocine.critics_rating).toBeLessThanOrEqual(5) : null;
        }

        if (item.betaseries && item.betaseries.users_rating) {
          expect(item.betaseries.users_rating).toBeGreaterThanOrEqual(0);
          expect(item.betaseries.users_rating).toBeLessThanOrEqual(5);
        }

        if (item.imdb) {
          expect(item.imdb.users_rating).toBeGreaterThanOrEqual(0);
          expect(item.imdb.users_rating).toBeLessThanOrEqual(10);
        }

        if (item.metacritic) {
          item.metacritic.users_rating ? expect(item.metacritic.users_rating).toBeGreaterThanOrEqual(0) : null;
          item.metacritic.users_rating ? expect(item.metacritic.users_rating).toBeLessThanOrEqual(10) : null;

          item.metacritic.critics_rating ? expect(item.metacritic.critics_rating).toBeGreaterThanOrEqual(10) : null;
          item.metacritic.critics_rating ? expect(item.metacritic.critics_rating).toBeLessThanOrEqual(100) : null;
        }

        if (item.rotten_tomatoes) {
          item.rotten_tomatoes.users_rating ? expect(item.rotten_tomatoes.users_rating).toBeGreaterThanOrEqual(10) : null;
          item.rotten_tomatoes.users_rating ? expect(item.rotten_tomatoes.users_rating).toBeLessThanOrEqual(100) : null;

          item.rotten_tomatoes.critics_rating ? expect(item.rotten_tomatoes.critics_rating).toBeGreaterThanOrEqual(10) : null;
          item.rotten_tomatoes.critics_rating ? expect(item.rotten_tomatoes.critics_rating).toBeLessThanOrEqual(100) : null;
        }
      }),
  },

  same_files_line_number_as_remote: {
    query: "?item_type=movie,tvshow&is_active=true,false&allData=true",
    expectedResult: (items) => {
      if (config.checkItemsNumber) {
        const filmsLines = countLines(config.films_ids_path);
        const seriesLines = countLines(config.series_ids_path);

        expect(filmsLines + seriesLines - 2).toEqual(items.total_results);
      }
    },
  },

  correct_tmdb_id_returned: {
    query: "/tv/87108?ratings_filters=all&allData=true",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.id).toBe(87108);
    },
  },

  correct_tvshow_item_type_returned: {
    query: "/tv/121?allData=true",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.item_type).toBe("tvshow");
    },
  },

  correct_movie_item_type_returned: {
    query: "/movie/121?allData=true",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.item_type).toBe("movie");
    },
  },

  results_count_on_search: {
    query: "?title=wolf&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(1);
      expect(data.results.length).toEqual(data.total_results);
    },
  },

  titles_containing_game_on_search: {
    query: "?title=game",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.title.toLowerCase()).toContain("game");
      }),
  },

  no_items_found_for_invalid_query: {
    query: "?title=some invalid value to be tested&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data.message).toBe("No items have been found.");
    },
  },

  ascending_popularity_average: {
    query: "?item_type=tvshow",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].popularity_average).toBeGreaterThanOrEqual(items[i - 1].popularity_average);
      }
    },
  },

  top_popularity_items: {
    query: "?item_type=tvshow&limit=200",
    expectedResult: (items) => {
      expect(items.slice(0, 10).filter((item) => item.allocine.popularity < 10).length).toBeGreaterThanOrEqual(3);
    },
  },

  correct_allocine_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=allocine_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].allocine.popularity).toBeGreaterThanOrEqual(items[i - 1].allocine.popularity);
      }
    },
  },

  correct_imdb_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].imdb.popularity).toBeGreaterThanOrEqual(items[i - 1].imdb.popularity);
      }
    },
  },

  correct_none_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=none,imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(items[i - 1].ratings_average);
      }
    },
  },

  items_with_minimum_ratings: {
    query: "?minimum_ratings=4,3.5",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.ratings_average).toBeGreaterThanOrEqual(3.5);
      }),
  },

  ratings_average_for_incorrect_minimum_ratings: {
    query: "?item_type=tvshow&popularity_filters=none&minimum_ratings=some invalid value to be tested",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(items[i - 1].ratings_average);
      }
    },
  },

  items_with_all_required_keys_active: {
    query: "?item_type=movie,tvshow&is_active=true&limit=400",
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive: {
    query: "?item_type=movie,tvshow&is_active=false&limit=9000",
    expectedResult: checkItemProperties,
  },

  all_keys_are_lowercase: {
    query: "?item_type=movie,tvshow&is_active=true&limit=400",
    expectedResult: (items) =>
      items.forEach((item) => {
        for (let key in item) {
          expect(key).toEqual(key.toLowerCase());
        }
      }),
  },

  unique_allocine_ids_movie: {
    query: "?item_type=movie&is_active=true,false&limit=9000",
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
  },

  unique_allocine_ids_tvshow: {
    query: "?item_type=tvshow&is_active=true,false&limit=9000",
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
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
    async function fetchItemsData() {
      const apiCall = `${baseURL}${query}`;

      console.log(`Calling ${apiCall}`);

      const response = await axios.get(apiCall);
      const data = response.data;
      const items = data.results;

      if (query.includes("allData=true")) {
        expectedResult(data);
      } else {
        expectedResult(items);
      }
    }

    test(
      name,
      async () => {
        await fetchItemsData();
      },
      config.timeout
    );
  });

  test(
    "api_response_time_should_be_within_an_acceptable_range",
    async () => {
      const start = new Date().valueOf();

      await axios.get(baseURL);

      const end = new Date().valueOf();
      const responseTime = end - start;

      const maxResponseTime = config.maxResponseTime;

      expect(responseTime).toBeLessThan(maxResponseTime);
    },
    config.timeout
  );
});
