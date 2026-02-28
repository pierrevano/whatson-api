const { sortEpisodes } = require("../utils/sortEpisodes");
const { getHighestRatedEpisode } = require("../content/getHighestRatedEpisode");
const { getLowestRatedEpisode } = require("../content/getLowestRatedEpisode");

const createRatingDistribution = () =>
  Array.from({ length: 10 }, (_, index) => String(index + 1)).reduce(
    (distribution, ratingKey) => ({
      ...distribution,
      [ratingKey]: 0,
    }),
    {},
  );

const createRatingDistributionEpisodes = () =>
  Array.from({ length: 10 }, (_, index) => String(index + 1)).reduce(
    (distribution, ratingKey) => ({
      ...distribution,
      [ratingKey]: [],
    }),
    {},
  );

const toEpisodeSummary = (episode) => ({
  season: episode.season,
  episode: episode.episode,
  title: episode.title,
  description: episode.description,
  id: episode.id,
  url: episode.url,
  release_date: episode.release_date,
  users_rating: episode.users_rating,
  users_rating_count: episode.users_rating_count,
});

const buildDefaultSeason = (
  seasonNumber,
  includeRatingDistribution,
  includeRatingDistributionEpisodes,
) => {
  const season = {
    season_number: seasonNumber,
    episodes_count: 0,
    ratings_sum: 0,
    ratings_count: 0,
    users_rating_count_sum: 0,
    season_episodes: [],
  };

  if (includeRatingDistribution) {
    season.rating_distribution = createRatingDistribution();
  }

  if (includeRatingDistributionEpisodes) {
    season.rating_distribution_episodes = createRatingDistributionEpisodes();
  }

  return season;
};

const buildSeasonsMetadata = (tvShow, options = {}) => {
  const {
    includeRatingDistribution = false,
    includeRatingDistributionEpisodes = false,
  } = options;
  const episodes = sortEpisodes([...(tvShow.episodes_details || [])]);
  const seasonsMap = new Map();

  episodes.forEach((episode) => {
    const seasonNumber = episode.season;
    if (!seasonsMap.has(seasonNumber)) {
      seasonsMap.set(
        seasonNumber,
        buildDefaultSeason(
          seasonNumber,
          includeRatingDistribution,
          includeRatingDistributionEpisodes,
        ),
      );
    }

    const season = seasonsMap.get(seasonNumber);
    season.episodes_count += 1;
    season.season_episodes.push(episode);

    if (typeof episode.users_rating === "number") {
      season.ratings_sum += episode.users_rating;
      season.ratings_count += 1;

      const ratingRange = String(
        Math.min(10, Math.max(1, Math.round(episode.users_rating))),
      );

      if (includeRatingDistribution) {
        season.rating_distribution[ratingRange] += 1;
      }

      if (includeRatingDistributionEpisodes) {
        season.rating_distribution_episodes[ratingRange].push(
          toEpisodeSummary(episode),
        );
      }
    }

    if (typeof episode.users_rating_count === "number") {
      season.users_rating_count_sum += episode.users_rating_count;
    }
  });

  for (
    let seasonNumber = 1;
    seasonNumber <= tvShow.seasons_number;
    seasonNumber++
  ) {
    if (!seasonsMap.has(seasonNumber)) {
      seasonsMap.set(
        seasonNumber,
        buildDefaultSeason(
          seasonNumber,
          includeRatingDistribution,
          includeRatingDistributionEpisodes,
        ),
      );
    }
  }

  return [...seasonsMap.values()]
    .sort((a, b) => a.season_number - b.season_number)
    .map((season) => {
      const highestRatedEpisode = getHighestRatedEpisode(
        "",
        season.season_episodes,
      );
      const lowestRatedEpisode = getLowestRatedEpisode(
        "",
        season.season_episodes,
      );

      const seasonData = {
        season_number: season.season_number,
        episodes_count: season.episodes_count,
        average_users_rating:
          season.ratings_count === 0
            ? null
            : Number((season.ratings_sum / season.ratings_count).toFixed(2)),
        users_rating_count:
          season.users_rating_count_sum > 0
            ? season.users_rating_count_sum
            : null,
        highest_episode: highestRatedEpisode,
        lowest_episode: lowestRatedEpisode,
      };

      if (includeRatingDistribution) {
        seasonData.rating_distribution = Object.fromEntries(
          Object.entries(season.rating_distribution).filter(
            ([, count]) => count > 0,
          ),
        );
      }

      if (includeRatingDistributionEpisodes) {
        seasonData.rating_distribution_episodes = Object.fromEntries(
          Object.entries(season.rating_distribution_episodes).filter(
            ([, episodes]) => episodes.length > 0,
          ),
        );
      }

      return seasonData;
    });
};

const filterEpisodesByRatingAndDate = (episodes, filters) => {
  const { minimumRatings = null, releaseDateRange = {} } = filters;
  const { gte = null, lte = null } = releaseDateRange;

  return episodes.filter((episode) => {
    if (minimumRatings !== null) {
      if (
        typeof episode.users_rating !== "number" ||
        episode.users_rating < minimumRatings
      ) {
        return false;
      }
    }

    if (gte !== null || lte !== null) {
      const releaseTimestamp = new Date(episode.release_date).getTime();
      if (Number.isNaN(releaseTimestamp)) {
        return false;
      }

      if (gte !== null && releaseTimestamp < gte.getTime()) {
        return false;
      }

      if (lte !== null && releaseTimestamp > lte.getTime()) {
        return false;
      }
    }

    return true;
  });
};

module.exports = {
  buildSeasonsMetadata,
  filterEpisodesByRatingAndDate,
};
