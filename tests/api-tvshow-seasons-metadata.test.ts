require("dotenv").config();

const axios = require("axios");

const { checkTypes } = require("./utils/checkTypes");
const { config } = require("../src/config");
const { tvshowSeasonSchema } = require("../src/tvshowSeasonSchema");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const maxLimit = config.maxLimit;
const removeLogs = process.env.REMOVE_LOGS === "true";

const activeTvshowIds = [];

const buildApiCall = (queryPath) =>
  `${baseURL}${queryPath}${queryPath.includes("?") ? "&" : "?"}api_key=${config.internalApiKey}`;

async function fetchPathData(queryPath) {
  const response = await axios.get(buildApiCall(queryPath), {
    validateStatus: (status) => status < 500,
  });

  expect(response.status).toBe(200);
  return response.data;
}

async function runForEachActiveTvshow(callback) {
  const concurrency = Math.max(
    1,
    Math.min(config.maxParallelSeasonRequests || 1, activeTvshowIds.length),
  );
  let currentIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < activeTvshowIds.length) {
      const tvshowId = activeTvshowIds[currentIndex];
      currentIndex += 1;

      try {
        await callback(tvshowId);
      } catch (error) {
        throw new Error(`TV show ${tvshowId}: ${error.message}`);
      }
    }
  });

  await Promise.all(workers);
}

describe("What's on? API tvshow seasons metadata tests", () => {
  beforeAll(async () => {
    if (!removeLogs) {
      console.log(`Testing on ${baseURL}`);
    }

    const data = await fetchPathData(
      `?item_type=tvshow&is_active=true&limit=${maxLimit}`,
    );
    const items = Array.isArray(data.results) ? data.results : [];

    const ids = items
      .map((item) => item.id)
      .filter((id) => Number.isInteger(id) && id > 0);

    activeTvshowIds.push(...new Set(ids));
    expect(activeTvshowIds.length).toBeGreaterThan(0);
  }, config.timeout);

  test(
    "return_tvshow_seasons_with_metadata",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons?append_to_response`,
        );

        checkTypes(item, tvshowSeasonSchema.tvshowSeasonsSchema);
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(Array.isArray(item.seasons)).toBe(true);
        expect(item.seasons.length).toBeGreaterThan(0);

        item.seasons.forEach((season) => {
          expect(typeof season.season_number).toBe("number");
          expect(typeof season.episodes_count).toBe("number");
          expect(season.episodes_count).toBeGreaterThanOrEqual(0);

          if (season.average_users_rating !== null) {
            expect(typeof season.average_users_rating).toBe("number");
          }

          expect(season).not.toHaveProperty("rating_distribution");
          expect(season).not.toHaveProperty("rating_distribution_episodes");
        });

        expect(item).not.toHaveProperty("highest_episode");
        expect(item).not.toHaveProperty("last_episode");
        expect(item).not.toHaveProperty("lowest_episode");
        expect(item).not.toHaveProperty("next_episode");
      });
    },
    config.timeout,
  );

  test(
    "return_tvshow_seasons_with_show_episode_metadata",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons?append_to_response=highest_episode,last_episode,lowest_episode,next_episode`,
        );

        checkTypes(
          item,
          tvshowSeasonSchema.tvshowSeasonsWithShowEpisodesSchema,
        );
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("highest_episode");
        expect(item).toHaveProperty("last_episode");
        expect(item).toHaveProperty("lowest_episode");
        expect(item).toHaveProperty("next_episode");

        if (item.last_episode !== null) {
          expect(typeof item.last_episode.users_rating).toBe("number");
        }

        if (item.next_episode !== null) {
          expect(typeof item.next_episode.release_date).toBe("string");
        }

        if (item.highest_episode !== null && item.lowest_episode !== null) {
          expect(item.highest_episode.users_rating).toBeGreaterThanOrEqual(
            item.lowest_episode.users_rating,
          );
        }
      });
    },
    config.timeout,
  );

  test(
    "return_tvshow_seasons_with_rating_distribution_metadata",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons?append_to_response=rating_distribution,rating_distribution_episodes`,
        );

        checkTypes(
          item,
          tvshowSeasonSchema.tvshowSeasonsWithRatingDistributionSchema,
        );
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(Array.isArray(item.seasons)).toBe(true);
        expect(item.seasons.length).toBeGreaterThan(0);

        item.seasons.forEach((season) => {
          const seasonKeys = Object.keys(season);
          expect(seasonKeys[seasonKeys.length - 2]).toBe("rating_distribution");
          expect(seasonKeys[seasonKeys.length - 1]).toBe(
            "rating_distribution_episodes",
          );

          expect(typeof season.season_number).toBe("number");
          expect(typeof season.episodes_count).toBe("number");
          expect(season.episodes_count).toBeGreaterThanOrEqual(0);

          if (season.average_users_rating !== null) {
            expect(typeof season.average_users_rating).toBe("number");
          }

          Object.entries(season.rating_distribution).forEach(
            ([rating, count]) => {
              expect(Number(rating)).toBeGreaterThanOrEqual(1);
              expect(Number(rating)).toBeLessThanOrEqual(10);
              expect(typeof count).toBe("number");
              expect(count).toBeGreaterThan(0);
            },
          );

          Object.entries(season.rating_distribution_episodes).forEach(
            ([ratingRange, episodes]) => {
              expect(Array.isArray(episodes)).toBe(true);
              expect(episodes.length).toBeGreaterThan(0);
              episodes.forEach((episode) => {
                expect(Math.round(episode.users_rating)).toBe(
                  Number(ratingRange),
                );
              });
              expect(season.rating_distribution[ratingRange]).toBe(
                episodes.length,
              );
            },
          );

          if (
            season.highest_episode !== null &&
            season.lowest_episode !== null
          ) {
            expect(typeof season.highest_episode.users_rating).toBe("number");
            expect(typeof season.lowest_episode.users_rating).toBe("number");
            expect(season.highest_episode.users_rating).toBeGreaterThanOrEqual(
              season.lowest_episode.users_rating,
            );
          }
        });
      });
    },
    config.timeout,
  );

  test(
    "return_tvshow_season_rating_distribution_episodes_shape_matches_highest_episode",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons?append_to_response=rating_distribution_episodes`,
        );

        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(Array.isArray(item.seasons)).toBe(true);
        expect(item.seasons.length).toBeGreaterThan(0);

        const getValueType = (value) =>
          value === null ? "null" : typeof value;
        const nullableEpisodeKeys = new Set(["description"]);

        item.seasons.forEach((season) => {
          const distributionEpisodes =
            season.rating_distribution_episodes || {};

          if (
            Object.keys(distributionEpisodes).length === 0 ||
            season.highest_episode === null
          ) {
            return;
          }

          const highestEpisodeKeys = Object.keys(season.highest_episode).sort();
          expect(highestEpisodeKeys.length).toBeGreaterThan(0);
          const highestEpisodeRange = String(
            Math.round(season.highest_episode.users_rating),
          );
          const episodesInHighestRange =
            distributionEpisodes[highestEpisodeRange] || [];
          expect(episodesInHighestRange.length).toBeGreaterThan(0);
          expect(
            episodesInHighestRange.some((episode) =>
              highestEpisodeKeys.every(
                (key) => episode[key] === season.highest_episode[key],
              ),
            ),
          ).toBe(true);

          Object.values(distributionEpisodes).forEach((episodes) => {
            expect(Array.isArray(episodes)).toBe(true);

            episodes.forEach((episode) => {
              const episodeKeys = Object.keys(episode).sort();

              expect(episodeKeys.length).toBe(highestEpisodeKeys.length);
              expect(episodeKeys).toEqual(highestEpisodeKeys);

              episodeKeys.forEach((key) => {
                const episodeValueType = getValueType(episode[key]);
                const highestEpisodeValueType = getValueType(
                  season.highest_episode[key],
                );

                if (nullableEpisodeKeys.has(key)) {
                  expect(["string", "null"]).toContain(episodeValueType);
                  expect(["string", "null"]).toContain(highestEpisodeValueType);
                  return;
                }

                expect(episodeValueType).toBe(highestEpisodeValueType);
              });
            });
          });
        });
      });
    },
    config.timeout,
  );

  test(
    "return_tvshow_season_rating_distribution_with_partial_append",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons?append_to_response=rating_distribution`,
        );

        checkTypes(
          item,
          tvshowSeasonSchema.tvshowSeasonsWithRatingDistributionOnlySchema,
        );
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(Array.isArray(item.seasons)).toBe(true);
        expect(item.seasons.length).toBeGreaterThan(0);

        item.seasons.forEach((season) => {
          const seasonKeys = Object.keys(season);
          expect(seasonKeys[seasonKeys.length - 1]).toBe("rating_distribution");

          expect(season).toHaveProperty("rating_distribution");
          expect(season).not.toHaveProperty("rating_distribution_episodes");
        });
      });
    },
    config.timeout,
  );

  test(
    "return_tvshow_season_rating_distribution_episodes_with_partial_append",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons?append_to_response=rating_distribution_episodes`,
        );

        checkTypes(
          item,
          tvshowSeasonSchema.tvshowSeasonsWithRatingDistributionEpisodesOnlySchema,
        );
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(Array.isArray(item.seasons)).toBe(true);
        expect(item.seasons.length).toBeGreaterThan(0);

        item.seasons.forEach((season) => {
          const seasonKeys = Object.keys(season);
          expect(seasonKeys[seasonKeys.length - 1]).toBe(
            "rating_distribution_episodes",
          );

          expect(season).not.toHaveProperty("rating_distribution");
          expect(season).toHaveProperty("rating_distribution_episodes");

          Object.entries(season.rating_distribution_episodes).forEach(
            ([ratingRange, episodes]) => {
              expect(Array.isArray(episodes)).toBe(true);
              expect(episodes.length).toBeGreaterThan(0);
              episodes.forEach((episode) => {
                expect(Math.round(episode.users_rating)).toBe(
                  Number(ratingRange),
                );
              });
            },
          );
        });
      });
    },
    config.timeout,
  );

  test(
    "return_only_requested_tvshow_season_episodes",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons/1/episodes?append_to_response`,
        );

        checkTypes(item, tvshowSeasonSchema.tvshowSeasonEpisodesSchema);
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(item.season_number).toBe(1);
        expect(Array.isArray(item.episodes)).toBe(true);
        expect(item.total_episodes).toBe(item.episodes.length);

        item.episodes.forEach((episode) => {
          expect(episode.season).toBe(1);
        });
      });
    },
    config.timeout,
  );

  test(
    "return_filtered_tvshow_season_episodes_by_rating_and_date",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons/1/episodes?minimum_ratings=7&release_date=from:2023-01-01,to:2025-12-31`,
        );

        checkTypes(item, tvshowSeasonSchema.tvshowSeasonEpisodesSchema);
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(item.season_number).toBe(1);
        expect(Array.isArray(item.episodes)).toBe(true);

        item.episodes.forEach((episode) => {
          expect(typeof episode.users_rating).toBe("number");
          expect(episode.users_rating).toBeGreaterThanOrEqual(7);
          expect(
            new Date(episode.release_date).getTime(),
          ).toBeGreaterThanOrEqual(new Date("2023-01-01").getTime());
          expect(new Date(episode.release_date).getTime()).toBeLessThanOrEqual(
            new Date("2025-12-31").getTime(),
          );
        });
      });
    },
    config.timeout,
  );

  test(
    "return_specific_tvshow_episode_details",
    async () => {
      await runForEachActiveTvshow(async (tvshowId) => {
        const seasonEpisodes = await fetchPathData(
          `/tvshow/${tvshowId}/seasons/1/episodes?append_to_response`,
        );

        if (
          !Array.isArray(seasonEpisodes.episodes) ||
          !seasonEpisodes.episodes[0]
        ) {
          return;
        }

        const firstEpisode = seasonEpisodes.episodes[0];
        const item = await fetchPathData(
          `/tvshow/${tvshowId}/seasons/1/episodes/${firstEpisode.episode}?append_to_response`,
        );

        checkTypes(item, tvshowSeasonSchema.tvshowSeasonEpisodeDetailsSchema);
        expect(item).not.toHaveProperty("_id");
        expect(item.id).toBe(tvshowId);
        expect(item.item_type).toBe("tvshow");
        expect(item.season_number).toBe(1);
        expect(item.episode_number).toBe(firstEpisode.episode);
        expect(typeof item.episode).toBe("object");
        expect(item.episode.season).toBe(1);
        expect(item.episode.episode).toBe(firstEpisode.episode);
        expect(typeof item.episode.title).toBe("string");
        expect(typeof item.episode.id).toBe("string");
        expect(typeof item.episode.url).toBe("string");
      });
    },
    config.timeout,
  );
});
