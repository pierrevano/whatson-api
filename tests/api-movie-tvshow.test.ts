require("dotenv").config();

const axios = require("axios");

const { checkRatings } = require("./utils/checkRatings");
const { checkTypes } = require("./utils/checkTypes");
const { config } = require("../src/config");
const { countNullValues } = require("./utils/countNullValues");
const { formatDate } = require("../src/utils/formatDate");
const { schema } = require("../src/schema");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const maxLimitLargeDocuments = config.maxLimitLargeDocuments;
const removeLogs = process.env.REMOVE_LOGS === "true";

/**
 * An object containing various query parameters and their expected results.
 * @type {Record<string, { query: string, expectedResult: (items: any) => void }>}
 */
const params = {
  only_adult_items: {
    query: "?item_type=movie,tvshow&is_active=true,false&is_adult=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeTruthy();
      }),
  },

  only_non_adult_items: {
    query: "?item_type=movie,tvshow&is_active=true,false&is_adult=false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  both_movies_and_tvshows: {
    query: "?item_type=movie,tvshow",
    expectedResult: (items) => {
      const movieItems = items.filter((item) => item.item_type === "movie");
      const tvshowItems = items.filter((item) => item.item_type === "tvshow");

      expect(movieItems.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );
      expect(tvshowItems.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );
    },
  },

  valid_users_ratings: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${maxLimitLargeDocuments}`,
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
    query: `?item_type=movie,tvshow&is_active=true&append_to_response=critics_rating_details,directors,episodes_details,genres,highest_episode,last_episode,lowest_episode,networks,next_episode,platforms_links,production_companies,certification_variants,image_variants,title_variants,parents_guide&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) =>
      items.forEach((item) => checkTypes(item, schema)),
  },

  no_french_localization_strings_in_responses: {
    query: `?item_type=movie,tvshow&is_active=true,false&append_to_response=platforms_links&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        const sanitizedItem = {
          ...item,
          platforms_links: Array.isArray(item.platforms_links)
            ? item.platforms_links.map(
                ({ name, ...platformLink }) => platformLink,
              )
            : item.platforms_links,
        };
        const serializedItem = JSON.stringify(sanitizedItem).toLowerCase();
        const potentialFrenchPattern = /[àâæçéèêëîïôœùûüÿ]/i;
        expect(serializedItem).not.toMatch(potentialFrenchPattern);
      }),
  },

  title_variants_should_include_at_least_one_french_character: {
    query: `?item_type=movie,tvshow&is_active=true,false&append_to_response=title_variants&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const potentialFrenchPattern = /[àâæçéèêëîïôœùûüÿ]/i;
      const matchingTitleVariantsCount = items
        .map((item) => item.title_variants?.fr)
        .filter(
          (titleVariant) =>
            titleVariant && potentialFrenchPattern.test(titleVariant),
        ).length;

      expect(matchingTitleVariantsCount).toBeGreaterThan(0);
    },
  },

  certification_should_not_include_tous_public_by_default: {
    query: `?item_type=movie,tvshow&is_active=true,false&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const matchingCertificationsCount = items.filter(
        (item) => item.certification?.trim() === "Tous publics",
      ).length;

      expect(matchingCertificationsCount).toBe(0);
    },
  },

  certification_variants_should_include_tous_public: {
    query: `?item_type=movie,tvshow&is_active=true,false&append_to_response=certification_variants&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const matchingCertificationVariantsCount = items
        .map((item) => item.certification_variants?.fr)
        .filter(
          (certificationVariant) =>
            certificationVariant?.trim() === "Tous publics",
        ).length;

      expect(matchingCertificationVariantsCount).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );
    },
  },

  parents_guide_should_return_categories_array: {
    query: `?item_type=movie,tvshow&is_active=true,false&append_to_response=parents_guide&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const itemsWithParentsGuide = items.filter(
        (item) =>
          typeof item.parents_guide === "object" &&
          typeof item.parents_guide?.url === "string" &&
          Array.isArray(item.parents_guide?.categories) &&
          item.parents_guide.categories.length > 0,
      );

      expect(itemsWithParentsGuide.length).toBeGreaterThan(
        config.minimumNumberOfItems.default,
      );
    },
  },

  should_limit_null_values_for_specific_keys_in_active_movies_and_tvshows: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${maxLimitLargeDocuments}`,
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

  popularity_average_not_below_one: {
    query: `?item_type=movie,tvshow&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item.popularity_average).toBeGreaterThan(1);
      });

      for (let i = 1; i < items.length; i++) {
        expect(items[i].popularity_average).toBeGreaterThanOrEqual(
          items[i - 1].popularity_average,
        );
      }
    },
  },

  items_with_no_minimum_ratings: {
    query: `?item_type=movie,tvshow&is_active=true,false&minimum_ratings=0&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.ratings_average).toBeGreaterThanOrEqual(0);
        expect(items.length).toEqual(maxLimitLargeDocuments);
      }),
  },

  all_keys_are_lowercase: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        for (let key in item) {
          expect(key).toEqual(key.toLowerCase());
        }
      }),
  },

  unique_trakt_ids_movie_and_tvshow: {
    query: `?item_type=movie,tvshow&is_active=true,false&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const occurrences = items.reduce((acc, item) => {
        if (item.trakt?.id) {
          acc[item.trakt.id] = (acc[item.trakt.id] || 0) + 1;
        }
        return acc;
      }, {});

      const duplicates = Object.entries(occurrences)
        .filter(([, count]) => count > 1)
        .map(([id]) => id);

      expect(duplicates).toEqual([]);
    },
  },

  items_updated_within_last_month: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const today = new Date();
      const dateInThePast = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000,
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

  should_return_correct_episodes_details_values: {
    query: `?item_type=movie,tvshow&append_to_response=episodes_details&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (item.episodes_details) {
          if (item.item_type === "movie") {
            expect(item.episodes_details).toBeNull();
          } else {
            let lastSeasonNumber = null;
            let lastEpisodeNumber = null;
            item.episodes_details.forEach((episode) => {
              if (episode?.season && episode?.episode) {
                const currentSeasonNumber = Number(episode.season);
                const currentEpisodeNumber = Number(episode.episode);

                if (lastSeasonNumber !== null && lastEpisodeNumber !== null) {
                  expect(
                    currentSeasonNumber > lastSeasonNumber ||
                      (currentSeasonNumber === lastSeasonNumber &&
                        currentEpisodeNumber > lastEpisodeNumber),
                  ).toBe(true);
                }

                lastSeasonNumber = currentSeasonNumber;
                lastEpisodeNumber = currentEpisodeNumber;

                if (
                  episode.release_date &&
                  formatDate(episode.release_date) >= formatDate(new Date())
                ) {
                  expect(episode.users_rating).toBeNull();
                }
              }
            });
          }
        }
      });
    },
  },

  should_sort_by_imdb_top_ranking_ascending: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity,tmdb_popularity&top_ranking_order=asc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousRanking = null;
      let smallestRanking = Infinity;

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.imdb.top_ranking).toBeGreaterThan(0);

        smallestRanking = Math.min(smallestRanking, item.imdb.top_ranking);

        if (previousRanking) {
          expect(item.imdb.top_ranking).toBeGreaterThanOrEqual(previousRanking);
        }

        previousRanking = item.imdb.top_ranking;
      });

      expect(items[0].imdb.top_ranking).toBe(smallestRanking);
    },
  },

  should_sort_by_imdb_top_ranking_descending: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity,tmdb_popularity&top_ranking_order=desc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousRanking = null;
      let largestRanking = -Infinity;

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.imdb.top_ranking).toBeGreaterThan(0);

        largestRanking = Math.max(largestRanking, item.imdb.top_ranking);

        if (previousRanking) {
          expect(item.imdb.top_ranking).toBeLessThanOrEqual(previousRanking);
        }

        previousRanking = item.imdb.top_ranking;
      });

      expect(items[0].imdb.top_ranking).toBe(largestRanking);
    },
  },

  should_keep_popularity_order_when_top_ranking_ties: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity,tmdb_popularity&top_ranking_order=asc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousPopularity = null;
      let previousTopRanking = null;

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.imdb.top_ranking).toBeGreaterThan(0);

        const popularity = item.popularity_average;

        if (
          previousTopRanking &&
          item.imdb.top_ranking === previousTopRanking &&
          popularity &&
          previousPopularity
        ) {
          expect(popularity).toBeGreaterThanOrEqual(previousPopularity);
        }

        previousPopularity = popularity;
        previousTopRanking = item.imdb.top_ranking;
      });
    },
  },

  should_fallback_to_popularity_when_top_ranking_order_invalid: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity,tmdb_popularity&top_ranking_order=invalid&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousPopularity = -Infinity;
      let sawMissingTopRanking = false;

      items.forEach((item) => {
        const popularity =
          typeof item.popularity_average === "number"
            ? item.popularity_average
            : Number.POSITIVE_INFINITY;

        expect(popularity).toBeGreaterThanOrEqual(previousPopularity);
        previousPopularity = popularity;

        if (!item.imdb || typeof item.imdb.top_ranking !== "number") {
          sawMissingTopRanking = true;
        }
      });

      expect(sawMissingTopRanking).toBe(true);
    },
  },

  should_sort_by_mojo_rank_ascending: {
    query: `?item_type=movie,tvshow&is_active=true,false&mojo_rank_order=asc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousRank = null;
      let smallestRank = Infinity;
      let previousTopLifetimeGross = Infinity;

      items.forEach((item, index) => {
        expect(item.mojo).toBeDefined();
        expect(typeof item.mojo.rank).toBe("number");
        expect(item.mojo.rank).toBeGreaterThan(0);

        smallestRank = Math.min(smallestRank, item.mojo.rank);

        if (index < config.minimumNumberOfMojoItems) {
          expect(item.mojo.rank).toBe(index + 1);
          expect(typeof item.mojo.lifetime_gross).toBe("number");
          expect(item.mojo.lifetime_gross).toBeGreaterThan(0);
          expect(item.mojo.lifetime_gross).toBeLessThanOrEqual(
            previousTopLifetimeGross,
          );
          previousTopLifetimeGross = item.mojo.lifetime_gross;
        }

        if (previousRank) {
          expect(item.mojo.rank).toBeGreaterThanOrEqual(previousRank);
        }

        previousRank = item.mojo.rank;
      });

      expect(items[0].mojo.rank).toBe(smallestRank);
    },
  },

  should_sort_by_mojo_rank_descending: {
    query: `?item_type=movie,tvshow&is_active=true,false&mojo_rank_order=desc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const itemsWithMojo = items.filter((item) => item.mojo);

      expect(itemsWithMojo.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      for (let i = 1; i < itemsWithMojo.length; i++) {
        expect(itemsWithMojo[i].mojo.rank).toBeLessThanOrEqual(
          itemsWithMojo[i - 1].mojo.rank,
        );
      }
    },
  },

  should_fallback_to_popularity_when_mojo_rank_order_invalid: {
    query: `?item_type=movie,tvshow&is_active=true,false&mojo_rank_order=invalid&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousPopularity = -Infinity;
      let sawMissingRank = false;

      items.forEach((item) => {
        const popularity =
          typeof item.popularity_average === "number"
            ? item.popularity_average
            : Number.POSITIVE_INFINITY;

        expect(popularity).toBeGreaterThanOrEqual(previousPopularity);
        previousPopularity = popularity;

        if (!item.mojo || typeof item.mojo.rank !== "number") {
          sawMissingRank = true;
        }
      });

      expect(sawMissingRank).toBe(true);
    },
  },

  should_prioritize_imdb_top_ranking_and_mojo_rank_orders: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity&top_ranking_order=asc&mojo_rank_order=asc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.mojo).toBeDefined();
        expect(typeof item.mojo.rank).toBe("number");
      });

      const comparator = (a, b) => {
        if (a.imdb.top_ranking !== b.imdb.top_ranking) {
          return a.imdb.top_ranking - b.imdb.top_ranking;
        }
        if (a.mojo.rank !== b.mojo.rank) {
          return a.mojo.rank - b.mojo.rank;
        }
      };

      const expectedOrder = items
        .slice()
        .sort(comparator)
        .map((item) => item.id);
      const actualOrder = items.map((item) => item.id);

      expect(actualOrder).toEqual(expectedOrder);
    },
  },

  order_and_minimum_users_rating_count_should_not_influence_movie_tvshow_results:
    {
      query:
        "?item_type=movie,tvshow&is_active=true,false&append_to_response=episodes_details&limit=20&order=asc&minimum_users_rating_count=5000",
      expectedResult: (items) => {
        const tvshowItems = items.filter((item) => item.item_type === "tvshow");
        const episodeUsersRatingCounts = tvshowItems.flatMap((item) =>
          Array.isArray(item.episodes_details)
            ? item.episodes_details
                .map((episode) => episode?.users_rating_count)
                .filter((count) => typeof count === "number")
            : [],
        );
        const isAscending = episodeUsersRatingCounts.every(
          (count, index) =>
            index === 0 || count >= episodeUsersRatingCounts[index - 1],
        );

        expect(tvshowItems.length).toBeGreaterThan(
          config.minimumNumberOfItems.softDefault,
        );
        expect(episodeUsersRatingCounts.length).toBeGreaterThan(
          config.minimumNumberOfItems.softDefault,
        );
        expect(
          episodeUsersRatingCounts.some((count) => count < 5000),
        ).toBeTruthy();
        expect(isAscending).toBeFalsy();
      },
    },
};

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API tests", () => {
  if (!removeLogs) {
    console.log(`Testing on ${baseURL}`);
  }

  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    async function fetchItemsData() {
      const apiCall = `${baseURL}${query}${query ? "&" : "?"}api_key=${config.internalApiKey}`;

      if (!removeLogs) {
        console.log("Test name:", name);
        console.log(`Calling: ${apiCall}`);

        console.time("axiosCallInTest");
      }

      const response = await axios.get(apiCall, {
        validateStatus: (status) => status < 500,
      });
      console.timeEnd("axiosCallInTest");

      const data = response.data;
      const items = query.startsWith("/") ? data : data.results;

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
    "api_response_time_should_be_within_an_acceptable_range_on_important_limit",
    async () => {
      const start = new Date().valueOf();
      const apiCall = `${baseURL}?item_type=movie,tvshow&limit=${maxLimitLargeDocuments}&api_key=${config.internalApiKey}`;

      if (!removeLogs) {
        console.log(`Calling: ${apiCall}`);
      }

      await axios.get(apiCall);
      const end = new Date().valueOf();
      expect(end - start).toBeLessThan(config.maxResponseTime);
    },
    config.timeout,
  );
});
