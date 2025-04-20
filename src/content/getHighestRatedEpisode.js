const { config } = require("../config");
const { formatDate } = require("../utils/formatDate");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the highest rated episode from a given list of episodes.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {Array<Object>} episodesDetails - Array of episode metadata objects.
 * @returns {Object|null} An object containing the highest-rated episode's details, or null if none found.
 */
const getHighestRatedEpisode = (allocineHomepage, episodesDetails) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let highestRatedEpisode = null;

  try {
    const validEpisodes = Array.isArray(episodesDetails)
      ? episodesDetails.filter(
          (ep) =>
            ep?.release_date && ep?.users_rating && ep?.users_rating_count,
        )
      : [];

    if (validEpisodes.length === 0) return null;

    validEpisodes.sort((a, b) => {
      if (b.users_rating !== a.users_rating) {
        return b.users_rating - a.users_rating;
      }

      if (b.users_rating_count !== a.users_rating_count) {
        return b.users_rating_count - a.users_rating_count;
      }

      if (formatDate(a.release_date) !== formatDate(b.release_date)) {
        return (
          new Date(formatDate(b.release_date)) -
          new Date(formatDate(a.release_date))
        );
      }

      if (a.season !== b.season) {
        return a.season - b.season;
      }

      return a.episode - b.episode;
    });

    const episode = validEpisodes[0];

    highestRatedEpisode = {
      season: episode.season,
      episode: episode.episode,
      title: episode.title,
      description: episode.description,
      id: episode.id,
      url: episode.url,
      release_date: episode.release_date,
      users_rating: episode.users_rating,
      users_rating_count: episode.users_rating_count,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getHighestRatedEpisode");
  }

  return highestRatedEpisode;
};

module.exports = { getHighestRatedEpisode };
