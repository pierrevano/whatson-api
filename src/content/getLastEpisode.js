const { config } = require("../config");
const { formatDate } = require("../utils/formatDate");
const { logErrors } = require("../utils/logErrors");
const { updateToReadableString } = require("../utils/updateToReadableString");

/**
 * Retrieves details of the last episode to have aired for a given tvshow, including its episode type from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {Array<Object>} episodesDetails - Array of episode metadata objects for the tvshow.
 * @param {object} data - The TMDB API response data for the tvshow.
 * @returns {Promise<Object|null>} A promise that resolves to an object containing the last episode's details, or null if no valid episode is found.
 */
const getLastEpisode = async (allocineHomepage, episodesDetails, data) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let lastEpisodeDetails = null;

  try {
    const pastEpisodes = Array.isArray(episodesDetails)
      ? episodesDetails.filter(
          (ep) =>
            ep?.release_date &&
            formatDate(ep.release_date) < formatDate(new Date()),
        )
      : [];

    if (pastEpisodes.length === 0) return null;

    const lastEpisode = pastEpisodes[pastEpisodes.length - 1];

    let episode_type = null;
    if (data?.last_episode_to_air) {
      const {
        season_number,
        episode_number,
        episode_type: type,
      } = data.last_episode_to_air;

      if (
        season_number === lastEpisode.season &&
        episode_number === lastEpisode.episode
      ) {
        episode_type = type;
      }
    }

    lastEpisodeDetails = {
      season: lastEpisode.season,
      episode: lastEpisode.episode,
      episode_type: updateToReadableString(episode_type),
      title: lastEpisode.title,
      description: lastEpisode.description,
      id: lastEpisode.id,
      url: lastEpisode.url,
      release_date: lastEpisode.release_date,
      users_rating: lastEpisode.users_rating,
      users_rating_count: lastEpisode.users_rating_count,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getLastEpisode");
  }

  return lastEpisodeDetails;
};

module.exports = { getLastEpisode };
