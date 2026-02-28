/* Schemas for tvshow season-level endpoints */
const seasonMetadataSchema = {
  season_number: "number", // Season number of the episode
  episodes_count: "number", // Number of episodes available in the season
  average_users_rating: "number", // Average rating given by IMDb users
  users_rating_count: "number", // Total number of ratings submitted by IMDb users
};

const episodeSchema = {
  season: "number", // Season number of the episode
  episode: "number", // Episode number within the season
  title: "string", // Title of the episode
  description: "string", // Description of the episode
  id: "string", // IMDb specific identifier
  url: "string", // URL to the IMDb page
  release_date: "string", // Release date of the episode
  users_rating: "number", // Average rating given by IMDb users
  users_rating_count: "number", // Total number of ratings submitted by IMDb users
};

const seasonRatedEpisodeSchema = {
  season: "number", // Season number of the episode
  episode: "number", // Episode number within the season
  title: "string", // Title of the episode
  description: "string", // Description of the episode
  id: "string", // IMDb specific identifier
  url: "string", // URL to the IMDb page
  release_date: "string", // Release date of the episode
  users_rating: "number", // Average rating given by IMDb users
  users_rating_count: "number", // Total number of ratings submitted by IMDb users
};

const seasonAiringEpisodeSchema = {
  season: "number", // Season number of the episode
  episode: "number", // Episode number within the season
  episode_type: "string", // Type of the episode
  title: "string", // Title of the episode
  description: "string", // Description of the episode
  id: "string", // IMDb specific identifier
  url: "string", // URL to the IMDb page
  release_date: "string", // Release date of the episode
  users_rating: "number", // Average rating given by IMDb users
  users_rating_count: "number", // Total number of ratings submitted by IMDb users
};

const seasonSummarySchema = {
  ...seasonMetadataSchema,
  highest_episode: seasonRatedEpisodeSchema,
  lowest_episode: seasonRatedEpisodeSchema,
};

const tvshowSeasonsSchema = {
  id: "number", // General identifier (The Movie Database ID)
  item_type: "string", // Type of the item (e.g., movie or tvshow)
  title: "string", // Title of the item
  seasons_number: "number", // Number of seasons available
  seasons: [seasonSummarySchema],
};

const tvshowSeasonsWithRatingDistributionSchema = {
  ...tvshowSeasonsSchema,
  seasons: [
    {
      ...seasonSummarySchema,
      rating_distribution: "object", // Number of episodes grouped by users rating ranges (1 to 10)
      rating_distribution_episodes: "object", // Episodes grouped by users rating ranges (1 to 10)
    },
  ],
};

const tvshowSeasonsWithRatingDistributionOnlySchema = {
  ...tvshowSeasonsSchema,
  seasons: [
    {
      ...seasonSummarySchema,
      rating_distribution: "object", // Number of episodes grouped by users rating ranges (1 to 10)
    },
  ],
};

const tvshowSeasonsWithRatingDistributionEpisodesOnlySchema = {
  ...tvshowSeasonsSchema,
  seasons: [
    {
      ...seasonSummarySchema,
      rating_distribution_episodes: "object", // Episodes grouped by users rating ranges (1 to 10)
    },
  ],
};

const tvshowSeasonsWithShowEpisodesSchema = {
  ...tvshowSeasonsSchema,
  last_episode: seasonAiringEpisodeSchema,
  next_episode: seasonAiringEpisodeSchema,
  highest_episode: seasonRatedEpisodeSchema,
  lowest_episode: seasonRatedEpisodeSchema,
};

const tvshowSeasonEpisodesSchema = {
  id: "number", // General identifier (The Movie Database ID)
  item_type: "string", // Type of the item (e.g., movie or tvshow)
  title: "string", // Title of the item
  season_number: "number", // Season number of the episode
  total_episodes: "number", // Number of episodes returned in the season
  episodes: [episodeSchema],
};

const tvshowSeasonEpisodeDetailsSchema = {
  id: "number", // General identifier (The Movie Database ID)
  item_type: "string", // Type of the item (e.g., movie or tvshow)
  title: "string", // Title of the item
  season_number: "number", // Season number of the episode
  episode_number: "number", // Episode number within the season
  episode: episodeSchema,
};

const tvshowSeasonSchema = {
  tvshowSeasonEpisodeDetailsSchema,
  tvshowSeasonEpisodesSchema,
  tvshowSeasonsWithShowEpisodesSchema,
  tvshowSeasonsWithRatingDistributionEpisodesOnlySchema,
  tvshowSeasonsWithRatingDistributionOnlySchema,
  tvshowSeasonsWithRatingDistributionSchema,
  tvshowSeasonsSchema,
};

module.exports = {
  tvshowSeasonSchema,
};
