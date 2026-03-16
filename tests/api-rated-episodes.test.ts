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

describe("What's on? API rated episodes tests", () => {
  beforeAll(() => {
    if (!removeLogs) {
      console.log(`Testing on ${baseURL}`);
    }
  });

  test(
    "return_top_rated_episodes_with_expected_shape",
    async () => {
      const data = await fetchPathData(
        `/episodes/rated?is_active=true&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

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
    config.timeout,
  );

  test(
    "return_lowest_rated_episodes_in_ascending_order",
    async () => {
      const data = await fetchPathData(
        `/episodes/rated?order=asc&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

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
    config.timeout,
  );

  test(
    "return_rated_episodes_filtered_by_season",
    async () => {
      const data = await fetchPathData(
        `/episodes/rated?filtered_seasons=1&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.season).toBe(1);
      });
    },
    config.timeout,
  );

  test(
    "return_top_rated_episodes_in_descending_order_by_default",
    async () => {
      const data = await fetchPathData("/episodes/rated?limit=20");

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
    config.timeout,
  );

  test(
    "return_requested_limit_of_rated_episodes",
    async () => {
      const limit = 5;
      const data = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=${limit}`,
      );

      expect(data.results.length).toBe(limit);
    },
    config.timeout,
  );

  test(
    "return_requested_page_of_rated_episodes",
    async () => {
      const data = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=10&page=2`,
      );

      expect(data.page).toBe(2);
      expect(data.results.length).toBeGreaterThan(0);
    },
    config.timeout,
  );

  test(
    "return_different_results_between_first_and_second_page",
    async () => {
      const firstPage = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=10&page=1`,
      );
      const secondPage = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=10&page=2`,
      );

      expect(firstPage.results.length).toBeGreaterThan(0);
      expect(secondPage.results.length).toBeGreaterThan(0);
      expect(getEpisodeKey(firstPage.results[0])).not.toBe(
        getEpisodeKey(secondPage.results[0]),
      );
    },
    config.timeout,
  );

  test(
    "return_consistent_total_pages_for_rated_episodes",
    async () => {
      const limit = 7;
      const data = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=${limit}`,
      );

      expect(data.total_pages).toBe(Math.ceil(data.total_results / limit));
    },
    config.timeout,
  );

  test(
    "return_rated_episodes_filtered_by_minimum_ratings",
    async () => {
      const minimumRatings = 8;
      const data = await fetchPathData(
        `/episodes/rated?minimum_ratings=${minimumRatings}&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.users_rating).toBeGreaterThanOrEqual(minimumRatings);
      });
    },
    config.timeout,
  );

  test(
    "return_rated_episodes_filtered_by_minimum_users_rating_count",
    async () => {
      const minimumUsersRatingCount = 5000;
      const data = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${minimumUsersRatingCount}&limit=20`,
      );

      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.users_rating_count).toBeGreaterThanOrEqual(
          minimumUsersRatingCount,
        );
      });
    },
    config.timeout,
  );

  test(
    "return_rated_episodes_filtered_by_release_date_range",
    async () => {
      const data = await fetchPathData(
        `/episodes/rated?release_date=from:2015-01-01,to:2025-12-31&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

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
    config.timeout,
  );

  test(
    "return_rated_episodes_filtered_by_multiple_seasons",
    async () => {
      const allowedSeasons = new Set([1, 2]);
      const data = await fetchPathData(
        `/episodes/rated?filtered_seasons=1,2&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(allowedSeasons.has(episode.season)).toBe(true);
      });
    },
    config.timeout,
  );

  test(
    "return_rated_episodes_filtered_by_tvshow_status",
    async () => {
      const data = await fetchPathData(
        `/episodes/rated?status=ended&minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(episode.tvshow.status).toBe("Ended");
      });
    },
    config.timeout,
  );

  test(
    "return_rated_episodes_with_episode_identity_fields",
    async () => {
      const data = await fetchPathData(
        `/episodes/rated?minimum_users_rating_count=${explicitMinimumUsersRatingCount}&limit=20`,
      );

      expect(data.results.length).toBeGreaterThan(0);
      data.results.forEach((episode) => {
        expect(typeof episode.title).toBe("string");
        expect(typeof episode.id).toBe("string");
        expect(typeof episode.url).toBe("string");
        expect(episode.url).toMatch(/^https:\/\/www\.imdb\.com\/title\//);
      });
    },
    config.timeout,
  );
});
