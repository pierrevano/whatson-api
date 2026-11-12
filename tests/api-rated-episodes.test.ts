require("dotenv").config();

const axios = require("axios");

const { checkTypes } = require("./utils/checkTypes");
const { config } = require("../src/config");
const { ratedEpisodesSchema } = require("../src/schema");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const removeLogs = process.env.REMOVE_LOGS === "true";
const explicitMinimumUsersRatingCount =
  config.minimumEpisodeUsersRatingCount + 100;

const buildApiCall = (queryPath) =>
  `${baseURL}${queryPath}${queryPath.includes("?") ? "&" : "?"}api_key=${config.internalApiKey}`;

async function fetchPathData(queryPath) {
  const response = await axios.get(buildApiCall(queryPath), {
    validateStatus: (status) => status < 500,
  });

  expect(response.status).toBe(200);
  return response.data;
}

const getEpisodeKey = (episode) =>
  `${episode.tvshow.id}-${episode.season}-${episode.episode}`;

const normalizeSearchValue = (value) => value.toLowerCase();

const matchesSearch = (episode, value) => {
  const searchValue = normalizeSearchValue(value);
  const networkMatches =
    Array.isArray(episode.tvshow.networks) &&
    episode.tvshow.networks.some((network) =>
      normalizeSearchValue(network).includes(searchValue),
    );

  return (
    normalizeSearchValue(episode.tvshow.title).includes(searchValue) ||
    normalizeSearchValue(episode.title).includes(searchValue) ||
    networkMatches
  );
};

/**
 * Request cases and their expected results.
 * @type {Record<string, { query: string, expectedResult: (data: any) => void | Promise<void> }>}
 */
const params = {
  return_top_rated_episodes_with_expected_shape: {
    query: `/episodes/rated?is_active=true&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      checkTypes(data, ratedEpisodesSchema);
      expect(data.page).toBe(1);
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.total_results).toBeGreaterThanOrEqual(data.results.length);
      data.results.forEach((episode) => {
        expect(episode.tvshow.id).toBeGreaterThan(0);
        expect(episode.tvshow.item_type).toBe("tvshow");
        expect(typeof episode.tvshow.title).toBe("string");
        expect(episode.tvshow.image).toMatch(/^https:\/\//);
        expect(episode.tvshow.seasons_number).toBeGreaterThan(0);
        expect(config.allowedTvshowStatuses).toContain(episode.tvshow.status);
        if (episode.tvshow.networks !== null) {
          expect(Array.isArray(episode.tvshow.networks)).toBe(true);
        }
        expect(episode.season).toBeGreaterThan(0);
        expect(episode.episode).toBeGreaterThan(0);
        expect(episode.users_rating_count).toBeGreaterThanOrEqual(
          explicitMinimumUsersRatingCount,
        );
      });
    },
  },

  return_lowest_rated_episodes_in_ascending_order: {
    query: `/episodes/rated?order=asc&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      expect(data.results.length).toBeGreaterThan(1);
      for (let index = 1; index < data.results.length; index++) {
        const previousEpisode = data.results[index - 1];
        const currentEpisode = data.results[index];

        if (previousEpisode.users_rating !== currentEpisode.users_rating) {
          expect(previousEpisode.users_rating).toBeLessThanOrEqual(
            currentEpisode.users_rating,
          );
          continue;
        }

        if (
          previousEpisode.users_rating_count !==
          currentEpisode.users_rating_count
        ) {
          expect(previousEpisode.users_rating_count).toBeGreaterThanOrEqual(
            currentEpisode.users_rating_count,
          );
        }
      }
    },
  },

  return_rated_episodes_filtered_by_season: {
    query: `/episodes/rated?filtered_seasons=1&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.season).toBe(1);
      });
    },
  },

  return_top_rated_episodes_in_descending_order_by_default: {
    query: "/episodes/rated?limit=20",
    expectedResult: (data) => {
      expect(data.results.length).toBeGreaterThan(1);
      for (let index = 1; index < data.results.length; index++) {
        const previousEpisode = data.results[index - 1];
        const currentEpisode = data.results[index];

        expect(previousEpisode.users_rating_count).toBeGreaterThanOrEqual(
          config.minimumEpisodeUsersRatingCount,
        );
        expect(currentEpisode.users_rating_count).toBeGreaterThanOrEqual(
          config.minimumEpisodeUsersRatingCount,
        );

        if (previousEpisode.users_rating !== currentEpisode.users_rating) {
          expect(previousEpisode.users_rating).toBeGreaterThanOrEqual(
            currentEpisode.users_rating,
          );
          continue;
        }

        if (
          previousEpisode.users_rating_count !==
          currentEpisode.users_rating_count
        ) {
          expect(previousEpisode.users_rating_count).toBeGreaterThanOrEqual(
            currentEpisode.users_rating_count,
          );
        }
      }
    },
  },

  return_requested_limit_of_rated_episodes: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=5`,
    expectedResult: (data) => {
      const limit = 5;
      expect(data.results.length).toBe(limit);
    },
  },

  return_requested_page_of_rated_episodes: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=10&page=2`,
    expectedResult: (data) => {
      expect(data.page).toBe(2);
      expect(data.results.length).toBeGreaterThan(0);
    },
  },

  return_different_results_between_first_and_second_page: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=10&page=1`,
    expectedResult: async (firstPage) => {
      const secondPage = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=10&page=2`,
      );
      expect(firstPage.results.length).toBeGreaterThan(0);
      expect(secondPage.results.length).toBeGreaterThan(0);
      const firstPageKeys = firstPage.results.map(getEpisodeKey);
      secondPage.results.forEach((episode) => {
        expect(firstPageKeys).not.toContain(getEpisodeKey(episode));
      });
    },
  },

  return_consistent_total_pages_for_rated_episodes: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=7`,
    expectedResult: (data) => {
      const limit = 7;
      expect(data.total_pages).toBe(Math.ceil(data.total_results / limit));
    },
  },

  return_rated_episodes_filtered_by_minimum_ratings: {
    query: `/episodes/rated?minimum_ratings=8&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      const minimumRatings = 8;
      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.users_rating).toBeGreaterThanOrEqual(minimumRatings);
      });
    },
  },

  return_rated_episodes_filtered_by_minimum_users_rating_count: {
    query: `/episodes/rated?minimum_users_rating_count=5000&limit=20`,
    expectedResult: (data) => {
      const minimumUsersRatingCount = 5000;
      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.users_rating_count).toBeGreaterThanOrEqual(
          minimumUsersRatingCount,
        );
      });
    },
  },

  return_rated_episodes_filtered_by_release_date_range: {
    query: `/episodes/rated?release_date=from:2015-01-01,to:2025-12-31&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        const releaseTimestamp = new Date(episode.release_date).getTime();
        expect(releaseTimestamp).toBeGreaterThanOrEqual(
          new Date("2015-01-01").getTime(),
        );
        expect(releaseTimestamp).toBeLessThanOrEqual(
          new Date("2025-12-31").getTime(),
        );
      });
    },
  },

  return_rated_episodes_filtered_by_multiple_seasons: {
    query: `/episodes/rated?filtered_seasons=1,2&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      const allowedSeasons = new Set([1, 2]);
      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(allowedSeasons.has(episode.season)).toBe(true);
      });
    },
  },

  return_rated_episodes_filtered_by_tvshow_status: {
    query: `/episodes/rated?status=ended&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.tvshow.status).toBe("Ended");
      });
    },
  },

  return_rated_episodes_filtered_by_tvshow_title_search: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: async (sourceData) => {
      const targetEpisode = sourceData.results[0];
      const data = await fetchPathData(
        `/episodes/rated?title=${encodeURIComponent(targetEpisode.tvshow.title)}&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );
      expect(data.results.length).toBeGreaterThan(0);
      expect(
        data.results.some(
          (episode) => getEpisodeKey(episode) === getEpisodeKey(targetEpisode),
        ),
      ).toBe(true);
      data.results.forEach((episode) => {
        expect(matchesSearch(episode, targetEpisode.tvshow.title)).toBe(true);
      });
    },
  },

  return_rated_episodes_filtered_by_episode_title_search: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: async (sourceData) => {
      const targetEpisode = sourceData.results[0];
      const data = await fetchPathData(
        `/episodes/rated?title=${encodeURIComponent(targetEpisode.title)}&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );
      expect(data.results.length).toBeGreaterThan(0);
      expect(
        data.results.some(
          (episode) => getEpisodeKey(episode) === getEpisodeKey(targetEpisode),
        ),
      ).toBe(true);
      data.results.forEach((episode) => {
        expect(matchesSearch(episode, targetEpisode.title)).toBe(true);
      });
    },
  },

  return_rated_episodes_filtered_by_network_search: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=50`,
    expectedResult: async (sourceData) => {
      const targetEpisode = sourceData.results.find(
        (episode) =>
          Array.isArray(episode.tvshow.networks) &&
          episode.tvshow.networks.length > 0,
      );
      if (!targetEpisode) {
        throw new Error("Expected at least one rated episode with a network.");
      }
      const network = targetEpisode.tvshow.networks[0];
      const data = await fetchPathData(
        `/episodes/rated?title=${encodeURIComponent(network)}&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );
      expect(data.results.length).toBeGreaterThan(0);
      expect(
        data.results.some(
          (episode) => getEpisodeKey(episode) === getEpisodeKey(targetEpisode),
        ),
      ).toBe(true);
      data.results.forEach((episode) => {
        expect(matchesSearch(episode, network)).toBe(true);
      });
    },
  },

  return_rated_episodes_with_episode_identity_fields: {
    query: `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
    expectedResult: (data) => {
      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(typeof episode.title).toBe("string");
        expect(typeof episode.id).toBe("string");
        expect(typeof episode.url).toBe("string");
        expect(episode.url).toMatch(/^https:\/\/www\.imdb\.com\/title\//);
      });
    },
  },

  rated_episodes_include_shows_with_unknown_critic_certification: {
    query:
      "/episodes/rated?title=One%20Tree%20Hill&critics_certified=false,true&limit=1",
    expectedResult: (data) => {
      expect(data.results).toHaveLength(1);
      expect(data.results[0].tvshow.id).toBe(269);
    },
  },

  rated_episodes_top_five_ratings_and_game_of_thrones_lead: {
    query: "/episodes/rated?limit=5",
    expectedResult: ({ results }) => {
      expect(results).toHaveLength(5);
      expect(results.map((episode) => episode.users_rating)).toEqual([
        9.9, 9.9, 9.9, 9.9, 9.9,
      ]);
      expect(results.slice(0, 2).map((episode) => episode.tvshow.id)).toEqual([
        1399, 1399,
      ]);
    },
  },

  rated_episodes_release_date_range_includes_both_boundaries: {
    query:
      "/episodes/rated?title=Game%20of%20Thrones&filtered_seasons=6&release_date=from:2016-06-12,to:2016-06-26&limit=20",
    expectedResult: ({ results, total_results }) => {
      expect(total_results).toBe(3);
      expect(
        results.map(({ id, release_date }) => ({ id, release_date })),
      ).toEqual([
        { id: "tt4283088", release_date: "2016-06-19T00:00:00.000Z" },
        { id: "tt4283094", release_date: "2016-06-26T00:00:00.000Z" },
        { id: "tt4283074", release_date: "2016-06-12T00:00:00.000Z" },
      ]);
    },
  },

  rated_episodes_release_date_from_only_is_inclusive: {
    query:
      "/episodes/rated?title=Game%20of%20Thrones&filtered_seasons=6&release_date=from:2016-06-19&limit=20",
    expectedResult: ({ results, total_results }) => {
      expect(total_results).toBe(2);
      expect(results.map((episode) => episode.id)).toEqual([
        "tt4283088",
        "tt4283094",
      ]);
    },
  },

  rated_episodes_release_date_to_only_is_inclusive: {
    query:
      "/episodes/rated?title=Game%20of%20Thrones&filtered_seasons=6&release_date=to:2016-05-01&limit=20",
    expectedResult: ({ results, total_results }) => {
      expect(total_results).toBe(2);
      expect(results.map((episode) => episode.id)).toEqual([
        "tt4077554",
        "tt3658014",
      ]);
    },
  },

  rated_episodes_release_date_range_returns_expected_second_page: {
    query:
      "/episodes/rated?title=Game%20of%20Thrones&filtered_seasons=6&release_date=from:2016-06-12,to:2016-06-26&limit=2&page=2",
    expectedResult: ({ page, results, total_pages, total_results }) => {
      expect(page).toBe(2);
      expect(total_results).toBe(3);
      expect(total_pages).toBe(2);
      expect(results.map((episode) => episode.id)).toEqual(["tt4283074"]);
    },
  },
};

describe("What's on? API rated episodes tests", () => {
  if (!removeLogs) {
    console.log(`Testing on ${baseURL}`);
  }

  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    test(
      name,
      async () => {
        const data = await fetchPathData(query);
        await expectedResult(data);
      },
      config.timeout,
    );
  });
});
