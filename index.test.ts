require("dotenv").config();

const axios = require("axios");
const fs = require("fs");

const { config } = require("./src/config");
const { schema } = require("./src/schema");

const baseURL =
  process.env.SOURCE === "remote" ? config.baseURLRemote : config.baseURLLocal;
const higherLimit =
  process.env.SOURCE === "remote"
    ? config.maxLimitRemote
    : config.maxLimitLocal;

/**
 * A function to count the number of lines in a file.
 *
 * @param {string} filename - The name of the file from which to read and count lines.
 * @returns {number} The number of lines in the file, excluding the header line.
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
 * This function checks if an item's property falls within a certain range and validates if the property value is a number with decimals.
 * If 'isStrict' is true, it checks if the property's value is greater than the minimum rating instead of greater than or equal to.
 *
 * @param {Object} item - The object to inspect.
 * @param {string} property - The property of the item to inspect.
 * @param {number} minRating - The minimum acceptable value for the item's property.
 * @param {number} maxRating - The maximum acceptable value for the item's property.
 * @param {boolean} [isStrict=false] - Whether the minimum value check should be strict (greater than) or inclusive
 */
function checkRatings(item, property, minRating, maxRating, isStrict = false) {
  if (item && item[property] !== null) {
    if (isStrict) {
      try {
        expect(item[property]).toBeGreaterThan(minRating);
      } catch (error) {
        console.log(item);
        throw error;
      }
    } else {
      expect(item[property]).toBeGreaterThanOrEqual(minRating);
    }
    expect(item[property]).toBeLessThanOrEqual(maxRating);
  }
}

/**
 * This function checks properties of given items.
 * It validates various metrics of different rating systems against predefined expectations.
 *
 * @param items - An array of objects/items that contains the properties to be checked.
 */
function checkItemProperties(items) {
  return items.forEach((item) => {
    /* Common */
    config.keysToCheck.forEach((key) => {
      item.is_active === true ? expect(item).toHaveProperty(key) : null;
      item.is_active === true
        ? expect(typeof item[key]).not.toBe("undefined")
        : null;
    });

    expect(items.filter((item) => item.is_active).length).toBeLessThanOrEqual(
      config.maximumIsActiveItems,
    );

    expect(item._id).not.toBeNull();

    expect(item.id).not.toBeNull();
    expect(typeof item.id).toBe("number");
    item.is_active === true ? expect(item.id).toBeGreaterThan(0) : null;

    expect(["movie", "tvshow"]).toContain(item.item_type);

    expect(item.title).not.toBeNull();

    expect(item.image).not.toBeNull();
    expect(item.image).toMatch(/\.(jpg|jpeg|png|gif)(\?[a-zA-Z0-9=&]*)?$/i);

    item.is_active === true && item.release_date !== null
      ? expect(!isNaN(new Date(item.release_date).getTime())).toBe(true)
      : null;

    item.is_active === true
      ? expect(
          items.filter((item) => item.release_date !== null).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;

    item.is_active === true
      ? expect(
          items.filter((item) => item.tagline).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;

    if (item.ratings_average === 0) {
      console.log(item);
    }
    expect(item.ratings_average).toBeGreaterThan(0);

    item.item_type === "tvshow" && item.platforms_links
      ? expect(
          item.platforms_links.filter((link) =>
            link.link_url.startsWith("https"),
          ).length,
        ).toBe(item.platforms_links.length)
      : null;
    item.item_type === "tvshow"
      ? expect(
          items.filter(
            (item) => item.platforms_links && item.platforms_links.length > 0,
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    item.item_type === "movie" && item.is_active === true
      ? expect(
          items.filter(
            (item) => item.platforms_links && item.platforms_links.length > 0,
          ).length,
        ).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.platformsLinksMovies,
        )
      : null;
    item.item_type === "tvshow" && item.platforms_links
      ? item.platforms_links.forEach((platform_link) => {
          expect(platform_link.name.includes("Regarder")).toBeFalsy();
        })
      : null;

    item.trailer ? expect(item.trailer).toMatch(/^https/) : null;
    expect(items.filter((item) => item.trailer).length).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.trailer,
    );
    item.trailer && item.is_active === true
      ? expect(
          items.filter(
            (item) =>
              item.trailer &&
              item.trailer.startsWith(config.baseURLDailymotion),
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.trailer)
      : null;

    /* Popularity */
    item.is_active === true
      ? expect(
          items.filter((item) => item.allocine.popularity).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.popularity)
      : null;
    item.is_active === true
      ? expect(
          items.filter((item) => item.imdb.popularity).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.popularity)
      : null;

    /* AlloCiné */
    expect(item.allocine).not.toBeNull();
    expect(Object.keys(item.allocine).length).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.allocine,
    );
    expect(
      items.filter((item) => typeof item.allocine.users_rating === "number")
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => typeof item.allocine.critics_rating === "number")
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => typeof item.allocine.critics_number === "number")
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => item.allocine.critics_rating_details).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter(
        (item) =>
          item.allocine.critics_rating_details &&
          typeof item.allocine.critics_rating_details[0].critic_name ===
            "string" &&
          typeof item.allocine.critics_rating_details[0].critic_rating ===
            "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    item.allocine && item.allocine.critics_number
      ? expect(item.allocine.critics_number).toEqual(
          item.allocine.critics_rating_details.length,
        )
      : null;

    /* IMDb */
    expect(item.imdb).not.toBeNull();
    expect(Object.keys(item.imdb).length).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.imdb,
    );
    expect(item.imdb.id.startsWith("tt")).toBeTruthy();
    expect(
      items.filter((item) => typeof item.imdb.users_rating === "number").length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    /* BetaSeries */
    item.betaseries
      ? expect(Object.keys(item.betaseries).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.betaseries,
        )
      : null;
    expect(
      items.filter(
        (item) =>
          item.betaseries && typeof item.betaseries.users_rating === "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    /* Metacritic */
    item.is_active === true && item.metacritic
      ? expect(Object.keys(item.metacritic).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.metacritic,
        )
      : null;
    expect(
      items.filter(
        (item) =>
          item.metacritic && typeof item.metacritic.users_rating === "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter(
        (item) =>
          item.metacritic && typeof item.metacritic.critics_rating === "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    /* Rotten Tomatoes */
    item.rotten_tomatoes
      ? expect(Object.keys(item.rotten_tomatoes).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.rottenTomatoes,
        )
      : null;
    expect(
      items.filter(
        (item) =>
          item.rotten_tomatoes &&
          typeof item.rotten_tomatoes.users_rating === "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter(
        (item) =>
          item.rotten_tomatoes &&
          typeof item.rotten_tomatoes.critics_rating === "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    /* Letterboxd */
    item.letterboxd
      ? expect(Object.keys(item.letterboxd).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.letterboxd,
        )
      : null;
    item.is_active === true && item.item_type === "movie"
      ? expect(
          items.filter(
            (item) =>
              item.letterboxd &&
              typeof item.letterboxd.users_rating === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    item.item_type === "tvshow" ? expect(item.letterboxd).toBeNull() : null; // No tvshows on Letterboxd (yet).

    /* SensCritique */
    item.senscritique
      ? expect(Object.keys(item.senscritique).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.senscritique,
        )
      : null;
    item.is_active === true
      ? expect(
          items.filter(
            (item) =>
              item.senscritique &&
              typeof item.senscritique.users_rating === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.senscritiqueItems)
      : null;
    item.senscritique
      ? expect(["string", "number"]).toContain(typeof item.senscritique.id)
      : null;

    /* TMDB */
    item.tmdb
      ? expect(Object.keys(item.tmdb).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.tmdb,
        )
      : null;
    item.tmdb ? expect(typeof item.tmdb.id).toBe("number") : null;
    item.is_active === true
      ? expect(
          items.filter(
            (item) => item.tmdb && typeof item.tmdb.users_rating === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;

    /* Trakt */
    item.trakt
      ? expect(Object.keys(item.trakt).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.trakt,
        )
      : null;
    item.is_active === true
      ? expect(
          items.filter(
            (item) => item.trakt && typeof item.trakt.users_rating === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.traktItems)
      : null;

    /* Mojo */
    item.is_active === true && item.item_type === "movie"
      ? expect(
          items.filter(
            (item) => item.mojo && item.mojo.lifetime_gross.charAt(0) === "$",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mojo)
      : null;
    item.is_active === true && item.item_type === "movie"
      ? expect(
          items.filter((item) => item.mojo && Number.isInteger(item.mojo.rank))
            .length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mojo)
      : null;
    item.item_type === "tvshow" ? expect(item.mojo).toBeNull() : null; // No mojo information for tvshow item type.
  });
}

function checkTypes(item, schema) {
  Object.keys(schema).forEach((key) => {
    // Check if the key from schema exists on the item
    if (item.hasOwnProperty(key)) {
      const expectedType = schema[key];
      const actualType = typeof item[key];

      if (item[key] === null) return;

      // Check for an array of objects
      if (
        Array.isArray(expectedType) &&
        expectedType.length > 0 &&
        typeof expectedType[0] === "object"
      ) {
        item[key].forEach((obj) => {
          checkTypes(obj, expectedType[0]);
        });
      } else if (
        typeof expectedType === "object" &&
        !Array.isArray(expectedType)
      ) {
        // Check if the item is an object and recurse
        checkTypes(item[key], expectedType);
      } else {
        // Simple type check
        expect(actualType).toBe(expectedType);
      }
    } else if (!item.hasOwnProperty(key)) {
      // The key is missing in the item
      throw new Error(`Missing required key '${key}' in the item.`);
    }
  });
}

/**
 * An object containing various query parameters and their expected results.
 * @param {object} params - An object containing various query parameters and their expected results.
 * @returns None
 */
const params = {
  valid_users_ratings: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        const ratingItems = [
          {
            source: item.allocine,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.allocine,
            max: config.ratingsValues.maximum.allocine,
            isStrict: true,
          },
          {
            source: item.allocine,
            ratingType: "critics_rating",
            min: config.ratingsValues.minimum.allocine,
            max: config.ratingsValues.maximum.allocine,
            isStrict: true,
          },
          {
            source: item.betaseries,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.betaseries,
            max: config.ratingsValues.maximum.betaseries,
          },
          {
            source: item.imdb,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.imdb,
            max: config.ratingsValues.maximum.imdb,
            isStrict: true,
          },
          {
            source: item.metacritic,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.metacriticUsers,
            max: config.ratingsValues.maximum.metacriticUsers,
          },
          {
            source: item.metacritic,
            ratingType: "critics_rating",
            min: config.ratingsValues.minimum.metacriticCritics,
            max: config.ratingsValues.maximum.metacriticCritics,
          },
          {
            source: item.rotten_tomatoes,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.rottenTomatoes,
            max: config.ratingsValues.maximum.rottenTomatoes,
          },
          {
            source: item.rotten_tomatoes,
            ratingType: "critics_rating",
            min: config.ratingsValues.minimum.rottenTomatoes,
            max: config.ratingsValues.maximum.rottenTomatoes,
          },
          {
            source: item.letterboxd,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.letterboxd,
            max: config.ratingsValues.maximum.letterboxd,
          },
          {
            source: item.senscritique,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.senscritique,
            max: config.ratingsValues.maximum.senscritique,
          },
          {
            source: item.tmdb,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.tmdb,
            max: config.ratingsValues.maximum.tmdb,
            isStrict: true,
          },
          {
            source: item.trakt,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.trakt,
            max: config.ratingsValues.maximum.trakt,
            isStrict: true,
          },
        ];

        for (let ratingItem of ratingItems) {
          checkRatings(
            ratingItem.source,
            ratingItem.ratingType,
            ratingItem.min,
            ratingItem.max,
            ratingItem.isStrict,
          );
        }
      }),
  },

  all_keys_type_check: {
    query: "",
    expectedResult: (items) =>
      items.forEach((item) => checkTypes(item, schema)),
  },

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
        expect(
          item.is_active === true || item.is_active === false,
        ).toBeTruthy();
      }),
  },

  only_tvshows_with_1_and_2_seasons: {
    query: "?item_type=tvshow&seasons_number=1,2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_tvshows_greater_than_1_season: {
    query: "?item_type=tvshow&seasons_number=1,2,5",
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
    query: "?item_type=tvshow&is_active=true,false&status=canceled,ended",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(["Canceled", "Ended"]).toContain(item.status);
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

  cinema_id_should_be_ignored: {
    query: "?cinema_id=undefined&is_active=true,false&limit=200",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(items.length).toBe(200);
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
    query: "?item_type=tvshow&seasons_number=1,2&page=2&limit=20&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(2);
      expect(data.results.length).toBe(20);
    },
  },

  no_items_found_on_page_3: {
    query: "?item_type=tvshow&seasons_number=1,2&page=3&limit=200&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data.message).toBe("No items have been found for page 3.");
    },
  },

  same_files_line_number_as_remote: {
    query: "?item_type=movie,tvshow&is_active=true,false&allData=true",
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
    query: "/tvshow/87108?ratings_filters=all&allData=true",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.id).toBe(87108);
      expect(data.ratings_average).toBeGreaterThan(0);
    },
  },

  correct_tmdb_id_returned_on_search: {
    query: "?tmdbid=87108",
    expectedResult: (items) => {
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(87108);
    },
  },

  correct_tvshow_item_type_returned: {
    query: "/tvshow/121?allData=true",
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

  correct_data_to_null_returned_if_undefined: {
    query: "/movie/undefined?allData=true",
    expectedResult: (data) => {
      expect(data).toBeNull;
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
        expect(items[i].popularity_average).toBeGreaterThanOrEqual(
          items[i - 1].popularity_average,
        );
      }
    },
  },

  top_popularity_items: {
    query: "?item_type=tvshow&limit=200",
    expectedResult: (items) => {
      expect(
        items.slice(0, 10).filter((item) => item.allocine.popularity < 10)
          .length,
      ).toBeGreaterThanOrEqual(0);
      expect(
        items.slice(0, 10).filter((item) => item.imdb.popularity < 10).length,
      ).toBeGreaterThanOrEqual(0);
    },
  },

  correct_allocine_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=allocine_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].allocine.popularity).toBeGreaterThanOrEqual(
          items[i - 1].allocine.popularity,
        );
      }
    },
  },

  correct_imdb_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].imdb.popularity).toBeGreaterThanOrEqual(
          items[i - 1].imdb.popularity,
        );
      }
    },
  },

  correct_none_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=none,imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(
          items[i - 1].ratings_average,
        );
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

  items_with_no_minimum_ratings: {
    query: `?item_type=movie,tvshow&is_active=true,false&minimum_ratings=0&limit=${higherLimit}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.ratings_average).toBeGreaterThanOrEqual(0);
        expect(items.length).toEqual(higherLimit);
      }),
  },

  compare_two_minimum_ratings: {
    query: "?item_type=tvshow&popularity_filters=none&minimum_ratings=3.5",
    expectedResult: async (items) => {
      const response = await axios.get(
        `${baseURL}?item_type=tvshow&popularity_filters=none&minimum_ratings=3.5,1`,
      );
      const data = response.data;
      const itemsFromExtraCall = data.results;

      expect(items.length).toEqual(itemsFromExtraCall.length);

      items.forEach((item, index) => {
        expect(item).toEqual(itemsFromExtraCall[index]);
      });
    },
  },

  compare_two_ratings_filters: {
    query: "?ratings_filters=all",
    expectedResult: async (items) => {
      const response = await axios.get(
        `${baseURL}?ratings_filters=${config.ratings_filters}`,
      );
      const results = response.data.results;

      items.forEach((item, index) => {
        expect(item.ratings_average).toEqual(results[index].ratings_average);
      });
    },
  },

  ratings_average_for_incorrect_minimum_ratings: {
    query:
      "?item_type=tvshow&popularity_filters=none&minimum_ratings=some invalid value to be tested",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(
          items[i - 1].ratings_average,
        );
      }
    },
  },

  items_with_all_required_keys_active_movie: {
    query: `?item_type=movie&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive_movie: {
    query: `?item_type=movie&is_active=false&limit=${higherLimit}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_active_tvshow: {
    query: `?item_type=tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive_tvshow: {
    query: `?item_type=tvshow&is_active=false&limit=${higherLimit}`,
    expectedResult: checkItemProperties,
  },

  all_keys_are_lowercase: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        for (let key in item) {
          expect(key).toEqual(key.toLowerCase());
        }
      }),
  },

  unique_allocine_ids_movie: {
    query: `?item_type=movie&is_active=true,false&limit=${higherLimit}`,
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
  },

  unique_allocine_ids_tvshow: {
    query: `?item_type=tvshow&is_active=true,false&limit=${higherLimit}`,
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
  },

  items_updated_within_last_month: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const today = new Date();
      const monthAgoDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      items.forEach((item) => {
        expect(item).toHaveProperty("updated_at");
        let itemDate = new Date(item.updated_at);
        expect(itemDate.getTime()).toBeGreaterThanOrEqual(
          monthAgoDate.getTime(),
        );
      });
    },
  },

  only_platforms_disney_plus: {
    query: `?item_type=tvshow&platforms=${encodeURIComponent("Disney+")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("platforms_links");
        expect(item.platforms_links).not.toBeNull();
        expect(
          item.platforms_links.some((platform) => platform.name === "Disney+"),
        ).toBeTruthy();
      });
    },
  },

  only_platforms_netflix_or_canal: {
    query: `?platforms=${encodeURIComponent("Netflix,Canal+")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("platforms_links");
        expect(item.platforms_links).not.toBeNull();
        const hasNetflix = item.platforms_links.some(
          (platform) => platform.name === "Netflix",
        );
        const hasCanalPlus = item.platforms_links.some(
          (platform) => platform.name === "Canal+",
        );
        expect(hasNetflix || hasCanalPlus).toBeTruthy();
      });
    },
  },

  not_existing_platforms_should_not_be_more_than_one: {
    query: `?platforms=${encodeURIComponent("all,Netflix,Canal+")}&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(
        items.filter((item) => item.platforms_links === null).length,
      ).toBeGreaterThan(config.minimumNumberOfItems.default);
      const allPlatformNames = [
        ...new Set(
          items.flatMap((item) =>
            item.platforms_links
              ? item.platforms_links.map((platform) => platform.name)
              : [],
          ),
        ),
      ];
      expect(
        allPlatformNames.filter((name) => !config.platforms.includes(name))
          .length,
      ).toBeLessThanOrEqual(1);
    },
  },

  should_return_no_values_when_platform_contains_all: {
    query: `?platforms=${encodeURIComponent("allAndSomeOtherWords,Netflix")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("platforms_links");
        expect(item.platforms_links).not.toBeNull();
        expect(
          item.platforms_links.some((platform) => platform.name === "Netflix"),
        ).toBeTruthy();
      });
    },
  },

  should_return_new_items_movie_when_filtered_by_release_date: {
    query: `?item_type=movie&is_active=true&release_date=everything,new&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("release_date");

        const releaseDate = new Date(item.release_date);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        expect(releaseDate).toBeInstanceOf(Date);
        expect(releaseDate).not.toBeNaN();
        expect(releaseDate.getTime()).toBeGreaterThanOrEqual(
          sixMonthsAgo.getTime(),
        );
      });
    },
  },

  should_return_new_items_tvshow_when_filtered_by_release_date: {
    query: `?item_type=tvshow&is_active=true&release_date=everything,new&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("release_date");

        const releaseDate = new Date(item.release_date);
        const eighteenMonthsAgo = new Date();
        eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
        expect(releaseDate).toBeInstanceOf(Date);
        expect(releaseDate).not.toBeNaN();
        expect(releaseDate.getTime()).toBeGreaterThanOrEqual(
          eighteenMonthsAgo.getTime(),
        );
      });
    },
  },

  should_return_all_items_if_release_date_does_not_include_new: {
    query: `?item_type=movie&is_active=true&release_date=everything&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("release_date");

        const releaseDate = new Date(item.release_date);
        const severalYearsAgo = new Date();
        severalYearsAgo.setFullYear(severalYearsAgo.getFullYear() - 1000);
        expect(releaseDate).toBeInstanceOf(Date);
        expect(releaseDate).not.toBeNaN();
        expect(releaseDate.getTime()).toBeGreaterThanOrEqual(
          severalYearsAgo.getTime(),
        );
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

  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    async function fetchItemsData() {
      const apiCall = `${baseURL}${query}`;

      console.log(`Calling ${apiCall}`);

      const response = await axios.get(apiCall);
      const data = response.data;
      const items = data && data.results;

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
      config.timeout,
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
    config.timeout,
  );
});
