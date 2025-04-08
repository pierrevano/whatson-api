require("dotenv").config();

const axios = require("axios");

const { checkRatings } = require("./utils/checkRatings");
const { checkTypes } = require("./utils/checkTypes");
const { config } = require("../src/config");
const { countNullValues } = require("./utils/countNullValues");
const { schema } = require("../src/schema");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const higherLimit = isRemoteSource ? config.maxLimitRemote : config.maxLimit;

/**
 * Validates properties and metrics of a list of items against predefined expectations.
 * The function checks for the presence and validity of certain properties based on item status and type.
 *
 * @param {Array<Object>} items - An array of objects representing the items to be validated. Each object
 *     should contain properties like `is_active`, `item_type`, `title`, `release_date`, and various
 *     ratings from different platforms (e.g., IMDb, AlloCiné, etc.).
 */
function checkItemProperties(items) {
  return items.forEach((item) => {
    /* Common */
    expect(Object.keys(item).length).toEqual(config.keysToCheck.length);

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

    expect(
      items.filter((item) => item.directors && item.directors.length > 0)
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    expect(
      items.filter((item) => item.genres && item.genres.length > 0).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    item.is_active === true ? expect(item.image).not.toBeNull() : null;
    item.is_active === true
      ? expect(item.image).toMatch(
          /^https:\/\/.*\.(jpg|jpeg|png|gif|jfif)(\?[a-zA-Z0-9=&]*)?$/i,
        )
      : null;

    item.release_date !== null
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
    item.is_active === true && item.item_type === "movie"
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

    if (item.item_type === "movie") {
      expect(item.episodes_details).toBeNull();
      expect(item.last_episode).toBeNull();
      expect(item.next_episode).toBeNull();
      expect(item.seasons_number).toBeNull();
      expect(item.status).toBeNull();
    }

    item.trailer
      ? expect(item.trailer).toMatch(
          /^(https:\/\/(fr\.vid\.web\.acsta\.net.*\.mp4|www\.youtube\.com\/embed.*|www\.dailymotion\.com\/embed.*))$/,
        )
      : null;
    expect(items.filter((item) => item.trailer).length).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.trailer,
    );

    item.is_active === true && item.item_type === "tvshow"
      ? expect(
          items.filter((item) => item.episodes_details).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    item.item_type === "tvshow" &&
    item.is_active === true &&
    item.episodes_details &&
    item.episodes_details.length > 0 &&
    item.episodes_details[0]
      ? expect(
          items.filter(
            (item) =>
              item.episodes_details &&
              item.episodes_details.length > 0 &&
              item.episodes_details[0] &&
              typeof item.episodes_details[0].season === "number" &&
              typeof item.episodes_details[0].episode === "number" &&
              typeof item.episodes_details[0].title === "string" &&
              typeof item.episodes_details[0].id === "string" &&
              typeof item.episodes_details[0].url === "string" &&
              typeof item.episodes_details[0].users_rating === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    item.is_active === true && item.item_type === "tvshow"
      ? expect(
          items.filter((item) => item.last_episode).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    expect(
      items.filter((item) => item.item_type === "movie" && item.last_episode)
        .length,
    ).toBe(0);
    const releaseDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    item.last_episode && item.last_episode.release_date
      ? expect(item.last_episode.release_date).toMatch(releaseDatePattern)
      : null;
    item.last_episode
      ? [
          "season",
          "episode",
          "episode_type",
          "title",
          "description",
          "id",
          "url",
          "release_date",
          "users_rating",
        ].forEach((key) => {
          expect(item.last_episode[key]).not.toBe("");

          if (["season", "episode", "title", "id", "url"].includes(key)) {
            expect(item.last_episode[key]).not.toBeNull();
          }
        })
      : null;

    item.is_active === true && item.item_type === "tvshow"
      ? expect(
          items.filter((item) => item.next_episode).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.nextEpisodes)
      : null;
    expect(
      items.filter((item) => item.item_type === "movie" && item.next_episode)
        .length,
    ).toBe(0);
    item.next_episode
      ? [
          "season",
          "episode",
          "episode_type",
          "title",
          "description",
          "id",
          "url",
          "release_date",
          "users_rating",
        ].forEach((key) => {
          expect(item.next_episode[key]).not.toBe("");

          if (
            [
              "season",
              "episode",
              "title",
              "id",
              "url",
              "release_date",
            ].includes(key)
          ) {
            expect(item.next_episode[key]).not.toBeNull();
          }
        })
      : null;

    item.is_active === true && item.item_type === "tvshow"
      ? expect(item.status).not.toBeNull()
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
    expect(item.allocine.id).not.toBeNull();
    expect(item.allocine.url).not.toBeNull();
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
    expect(item.imdb.id).not.toBeNull();
    expect(item.imdb.url).not.toBeNull();
    expect(Object.keys(item.imdb).length).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.imdb,
    );
    expect(item.imdb.id.startsWith("tt")).toBeTruthy();
    expect(
      items.filter((item) => typeof item.imdb.users_rating === "number").length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    /* BetaSeries */
    item.betaseries ? expect(item.betaseries.id).not.toBeNull() : null;
    item.betaseries ? expect(item.betaseries.url).not.toBeNull() : null;
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
    item.metacritic ? expect(item.metacritic.id).not.toBeNull() : null;
    item.metacritic ? expect(item.metacritic.url).not.toBeNull() : null;
    item.metacritic
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
      ? expect(item.rotten_tomatoes.id).not.toBeNull()
      : null;
    item.rotten_tomatoes
      ? expect(item.rotten_tomatoes.url).not.toBeNull()
      : null;
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
    item.letterboxd ? expect(item.letterboxd.id).not.toBeNull() : null;
    item.letterboxd ? expect(item.letterboxd.url).not.toBeNull() : null;
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
    item.senscritique ? expect(item.senscritique.id).not.toBeNull() : null;
    item.senscritique ? expect(item.senscritique.url).not.toBeNull() : null;
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
    item.tmdb ? expect(item.tmdb.id).not.toBeNull() : null;
    item.tmdb ? expect(item.tmdb.url).not.toBeNull() : null;
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
    item.trakt ? expect(item.trakt.id).not.toBeNull() : null;
    item.trakt ? expect(item.trakt.url).not.toBeNull() : null;
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

    /* TV Time */
    item.tv_time ? expect(item.tv_time.id).not.toBeNull() : null;
    item.tv_time ? expect(item.tv_time.url).not.toBeNull() : null;
    item.tv_time
      ? expect(Object.keys(item.tv_time).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.tvtime,
        )
      : null;
    item.is_active === true && item.item_type === "tvshow"
      ? expect(
          items.filter(
            (item) =>
              item.tv_time && typeof item.tv_time.users_rating === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    item.item_type === "movie" ? expect(item.tv_time).toBeNull() : null; // No tv_time information for movie item type.

    /* TheTVDB */
    item.thetvdb ? expect(item.thetvdb.id).not.toBeNull() : null;
    item.thetvdb ? expect(item.thetvdb.url).not.toBeNull() : null;
    item.thetvdb
      ? expect(Object.keys(item.thetvdb).length).toBeGreaterThanOrEqual(
          config.minimumNumberOfItems.thetvdb,
        )
      : null;
    item.is_active === true && item.thetvdb
      ? expect(
          items.filter(
            (item) => item.thetvdb && typeof item.thetvdb.slug === "string",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;

    /* Mojo */
    item.mojo ? expect(item.mojo.rank).toBeGreaterThan(0) : null;
    item.mojo ? expect(item.mojo.url).not.toBeNull() : null;
    item.mojo
      ? expect(item.mojo.lifetime_gross.startsWith("$")).toBeTruthy()
      : null;
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

/**
 * Validates that the ID of a single item in an array matches the expected value.
 *
 * @param {Array<Object>} items - An array of items, typically containing only one item, expected to be returned from the API.
 *                                The item is expected to have a `tmdb` object containing an `id` property.
 * @param {number} expectedId - The expected ID value that the single item's ID should match.
 */
function checkSingleItemId(items, expectedId) {
  expect(items.length).toBe(1);
  expect(items[0].tmdb.id).toBe(expectedId);
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
          {
            source: item.tv_time,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.tvtime,
            max: config.ratingsValues.maximum.tvtime,
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
    query: `?item_type=movie,tvshow&is_active=true,false&append_to_response=critics_rating_details,episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) =>
      items.forEach((item) => checkTypes(item, schema)),
  },

  default_movies: {
    query: "",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");

        expect(item.allocine).not.toHaveProperty("critics_rating_details");
        expect(item).not.toHaveProperty("episodes_details");
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

  should_limit_null_values_for_specific_keys_in_active_movies_and_tvshows: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const result = countNullValues(items);

      expect(result.totalMovieNullCount).toBeLessThanOrEqual(
        config.maxNullValues,
      );
      expect(result.totalTVShowNullCount).toBeLessThanOrEqual(
        config.maxNullValues,
      );
    },
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
      items.forEach((_) => {
        expect(items.length).toBe(200);
      }),
  },

  custom_limit_value_to_1: {
    query: "?limit=1",
    expectedResult: (items) => {
      expect(items.length).toBe(1);
    },
  },

  custom_limit_value_to_5: {
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

  correct_tmdb_id_returned_on_search: {
    query: "?tmdbid=87108",
    expectedResult: (items) => {
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(87108);
    },
  },

  titles_containing_game_on_search: {
    query: "?title=game",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.title.toLowerCase()).toContain("game");
      }),
  },

  should_return_allocine_id_on_search: {
    query: "?allocineid=304508",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_betaseries_id_on_search: {
    query: "?betaseriesid=132011-emilia-perez&allocineid=304508",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_imdb_id_on_search: {
    query: "?imdbid=tt20221436&letterboxdid=unknown",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_imdb_id_case_sensitive_on_search: {
    query: "?imdbId=tt20221436&letterboxdid=unknown",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_letterboxd_id_on_search: {
    query: "?letterboxdid=emilia-perez",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_metacritic_id_on_search: {
    query: "?metacriticid=squid-game",
    expectedResult: (items) => {
      checkSingleItemId(items, 93405);
    },
  },
  should_return_rottentomatoes_id_on_search: {
    query: "?rottentomatoesid=emilia_perez",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_senscritique_id_on_search: {
    query: "?senscritiqueid=54313969",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_trakt_id_on_search: {
    query: "?traktid=783557",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_tmdb_id_on_search: {
    query: "?tmdbid=974950",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_tvtime_id_on_search: {
    query: "?tvtimeid=383275",
    expectedResult: (items) => {
      checkSingleItemId(items, 93405);
    },
  },
  should_return_thetvdb_id_on_search: {
    query: "?thetvdbid=383275",
    expectedResult: (items) => {
      checkSingleItemId(items, 93405);
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

  top_popularity_items_movie: {
    query: "?item_type=movie&limit=200",
    expectedResult: (items) => {
      expect(
        items.filter(
          (item) =>
            item.allocine.popularity >= 1 && item.allocine.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
      expect(
        items.filter(
          (item) => item.imdb.popularity >= 1 && item.imdb.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
    },
  },

  top_popularity_items_tvshow: {
    query: "?item_type=tvshow&limit=200",
    expectedResult: (items) => {
      expect(
        items.filter(
          (item) =>
            item.allocine.popularity >= 1 && item.allocine.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
      expect(
        items.filter(
          (item) => item.imdb.popularity >= 1 && item.imdb.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
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

  popularity_filters_with_wrong_value: {
    query: "?item_type=tvshow&popularity_filters=wrong_value",
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
        `${baseURL}?item_type=tvshow&popularity_filters=none&minimum_ratings=3.5,1&api_key=${config.internalApiKey}`,
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
        `${baseURL}?ratings_filters=${config.ratings_filters}&api_key=${config.internalApiKey}`,
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
    query: `?item_type=movie&is_active=true&append_to_response=critics_rating_details,episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive_movie: {
    query: `?item_type=movie&is_active=false&append_to_response=critics_rating_details,episodes_details&limit=${higherLimit}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_active_tvshow: {
    query: `?item_type=tvshow&is_active=true&append_to_response=critics_rating_details,episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive_tvshow: {
    query: `?item_type=tvshow&is_active=false&append_to_response=critics_rating_details,episodes_details&limit=${config.maxLimitRemote}`,
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

  items_updated_within_last_2_months: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const today = new Date();
      const dateInThePast = new Date(
        today.getTime() - 60 * 24 * 60 * 60 * 1000,
      );

      items.forEach((item) => {
        expect(item).toHaveProperty("updated_at");
        let itemDate = new Date(item.updated_at);
        expect(itemDate.getTime()).toBeGreaterThanOrEqual(
          dateInThePast.getTime(),
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

  should_return_correct_value_when_platform_contains_all: {
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

  only_genres_drama: {
    query: `?item_type=tvshow&genres=${encodeURIComponent("Drama")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("genres");
        expect(item.genres).not.toBeNull();
        expect(item.genres.some((genre) => genre === "Drama")).toBeTruthy();
      });
    },
  },

  only_directors_xxx: {
    query: `?item_type=tvshow&directors=xxx`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("directors");
        expect(item.directors).not.toBeNull();
        expect(items.length).toBeLessThanOrEqual(2);
      });
    },
  },

  only_genres_drama_and_platforms_netflix: {
    query: `?item_type=tvshow&genres=${encodeURIComponent("Drama")}&platforms=${encodeURIComponent("Netflix")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("genres");
        expect(item).toHaveProperty("platforms_links");

        expect(item.genres).not.toBeNull();
        expect(item.platforms_links).not.toBeNull();

        expect(item.genres.some((genre) => genre === "Drama")).toBeTruthy();
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

  should_return_minimum_5_recently_released_items: {
    query: `?item_type=movie&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const recentItems = items.filter((item) => {
        if (!item.hasOwnProperty("release_date")) {
          return false;
        }
        const releaseDate = new Date(item.release_date);
        if (isNaN(releaseDate.getTime())) {
          return false;
        }
        const today = new Date();
        const eightDaysAgo = new Date();
        eightDaysAgo.setDate(today.getDate() - 8);
        return releaseDate >= eightDaysAgo && releaseDate <= today;
      });

      expect(recentItems.length).toBeGreaterThanOrEqual(5);
    },
  },

  should_return_correct_episodes_details_values: {
    query: `?item_type=movie,tvshow&append_to_response=critics_rating_details,episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (item.episodes_details) {
          if (item.item_type === "movie") {
            expect(item.episodes_details).toBeNull();
          } else if (item.item_type === "tvshow") {
            let lastGlobalEpisodeNumber = -1;
            item.episodes_details.forEach((episode) => {
              if (episode && episode.season && episode.episode) {
                const currentGlobalEpisodeNumber = parseInt(
                  `${String(episode.season)}${String(episode.episode).padStart(2, "0")}`,
                );
                expect(currentGlobalEpisodeNumber).toBeGreaterThan(
                  lastGlobalEpisodeNumber,
                );
                lastGlobalEpisodeNumber = currentGlobalEpisodeNumber;

                // Check that future episodes have null users_rating
                if (episode.release_date) {
                  const releaseDate = new Date(episode.release_date)
                    .toISOString()
                    .split("T")[0];
                  const today = new Date().toISOString().split("T")[0];
                  if (releaseDate > today) {
                    expect(episode.users_rating).toBeNull();
                  }
                }
              }
            });
          }
        }
      });
    },
  },

  should_match_last_episode_details: {
    query: `?item_type=tvshow&append_to_response=critics_rating_details,episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (item.episodes_details && item.last_episode) {
          const pastEpisodes = item.episodes_details.filter(
            (ep) =>
              ep?.release_date &&
              new Date(ep.release_date).toISOString().split("T")[0] <=
                new Date().toISOString().split("T")[0],
          );

          if (pastEpisodes.length === 0) return;

          const lastAired = pastEpisodes[pastEpisodes.length - 1];

          if (lastAired) {
            expect(lastAired.title).toBe(item.last_episode.title);
            expect(lastAired.episode).toBe(item.last_episode.episode);
            expect(lastAired.season).toBe(item.last_episode.season);
            expect(lastAired.id).toBe(item.last_episode.id);
            expect(lastAired.url).toBe(item.last_episode.url);
          }
        }
      });
    },
  },

  should_have_next_episode_greater_than_last_episode: {
    query: `?item_type=tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (item.last_episode && item.next_episode) {
          const lastSeason = item.last_episode.season;
          const lastEpisode = item.last_episode.episode;
          const nextSeason = item.next_episode.season;
          const nextEpisode = item.next_episode.episode;

          const lastCombined = lastSeason * 100 + lastEpisode;
          const nextCombined = nextSeason * 100 + nextEpisode;

          const lastReleaseDate = item.last_episode.release_date;
          const nextReleaseDate = item.next_episode.release_date;

          if (
            lastReleaseDate &&
            nextReleaseDate &&
            lastReleaseDate === nextReleaseDate
          )
            return;

          expect(nextCombined).toBeGreaterThanOrEqual(lastCombined);
        }
      });
    },
  },

  should_have_release_date_after_current_date: {
    query: `?item_type=tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const currentDate = new Date().getTime();
      const thresholdDate = currentDate - 48 * 60 * 60 * 1000;

      items.forEach((item) => {
        if (item.next_episode) {
          const releaseDate = new Date(
            item.next_episode.release_date,
          ).getTime();
          expect(!isNaN(releaseDate)).toBe(true);
          expect(releaseDate).toBeGreaterThan(thresholdDate);
        }
      });
    },
  },

  should_not_have_next_episode_when_tvshow_is_ended: {
    query: `?item_type=tvshow&status=ended&is_active=true,false&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ended");
        expect(item.next_episode).toBeNull();
      });
    },
  },

  should_only_have_last_episode_released_until_today: {
    query: `?item_type=tvshow&is_active=true,false&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (item.last_episode && item.last_episode.release_date) {
          const releaseDate = new Date(item.last_episode.release_date)
            .toISOString()
            .split("T")[0];
          expect(releaseDate <= new Date().toISOString().split("T")[0]).toBe(
            true,
          );
        }
      });
    },
  },

  should_only_have_valid_imdb_episode_urls: {
    query: `?item_type=tvshow&is_active=true,false&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (Array.isArray(item.episodes_details)) {
          item.episodes_details.forEach((episode) => {
            if (episode?.url) {
              expect(typeof episode.url).toBe("string");
              expect(
                /^https:\/\/www\.imdb\.com\/title\/tt\d+\/$/.test(episode.url),
              ).toBe(true);
            }
          });
        }
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
      if (query.includes("directors=xxx")) {
        const apiCallDirectors = `${baseURL}?api_key=${config.internalApiKey}`;
        const responseDirectors = await axios.get(apiCallDirectors, {
          validateStatus: (status) => status < 500,
        });
        const dataDirectors = responseDirectors.data;
        const itemsDirectors = dataDirectors && dataDirectors.results;
        const directorName = itemsDirectors[0].directors[0];

        query = `?directors=${encodeURIComponent(directorName)}`;
      }

      const apiCall = `${baseURL}${query}${query ? "&" : "?"}api_key=${config.internalApiKey}`;

      console.log("Test name:", name);
      console.log(`Calling ${apiCall}`);

      const response = await axios.get(apiCall, {
        validateStatus: (status) => status < 500,
      });
      const data = response.data;
      const items = data && data.results;

      expectedResult(items, null);
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
      await axios.get(`${baseURL}?api_key=${config.internalApiKey}`);
      const end = new Date().valueOf();
      expect(end - start).toBeLessThan(config.maxResponseTime);
    },
    config.timeout,
  );

  test(
    "api_response_time_should_be_within_an_acceptable_range_on_important_limit",
    async () => {
      const start = new Date().valueOf();
      await axios.get(
        `${baseURL}?item_type=movie,tvshow&limit=${config.maxLimit}&api_key=${config.internalApiKey}`,
      );
      const end = new Date().valueOf();
      expect(end - start).toBeLessThan(config.maxResponseTime);
    },
    config.timeout,
  );
});
