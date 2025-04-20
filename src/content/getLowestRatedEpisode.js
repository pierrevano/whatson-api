const { config } = require("../config");
const { formatDate } = require("../utils/formatDate");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the lowest rated episode from a given list of episodes.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {Array<Object>} episodesDetails - Array of episode metadata objects.
 * @returns {Object|null} An object containing the lowest-rated episode's details, or null if none found.
 */
const getLowestRatedEpisode = (allocineHomepage, episodesDetails) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let lowestRatedEpisode = null;

  try {
    const validEpisodes = Array.isArray(episodesDetails)
      ? episodesDetails.filter(
          (ep) =>
            ep?.release_date &&
            ep?.users_rating != null &&
            ep?.users_rating_count != null,
        )
      : [];

    if (validEpisodes.length === 0) return null;

    validEpisodes.sort((a, b) => {
      if (a.users_rating !== b.users_rating) {
        return a.users_rating - b.users_rating;
      }

      if (a.users_rating_count !== b.users_rating_count) {
        return a.users_rating_count - b.users_rating_count;
      }

      if (formatDate(a.release_date) !== formatDate(b.release_date)) {
        return (
          new Date(formatDate(a.release_date)) -
          new Date(formatDate(b.release_date))
        );
      }

      if (a.season !== b.season) {
        return a.season - b.season;
      }

      return a.episode - b.episode;
    });

    const episode = validEpisodes[0];

    lowestRatedEpisode = {
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
    logErrors(error, allocineHomepage, "getLowestRatedEpisode");
  }

  return lowestRatedEpisode;
};

module.exports = { getLowestRatedEpisode };
