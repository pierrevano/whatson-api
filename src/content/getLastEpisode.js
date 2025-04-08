const { config } = require("../config");
const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the last episode to air for a given tvshow and the episode type from The Movie Database API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {number} tmdbId - TMDB ID for the tvshow.
 * @param {string} imdbId - IMDb ID for the tvshow.
 * @param {string} imdbHomepage - IMDb homepage URL for the tvshow.
 * @returns {Promise<Object|null>} - A promise that resolves with the details of the last episode or null if the details cannot be determined.
 */
const getLastEpisode = async (allocineHomepage, episodesDetails, tmdbId) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let lastEpisodeDetails = null;

  try {
    let lastEpisode = null;

    if (Array.isArray(episodesDetails) && episodesDetails.some((ep) => ep)) {
      const pastEpisodes = episodesDetails.filter(
        (ep) =>
          ep?.release_date &&
          new Date(ep.release_date).toISOString().split("T")[0] <=
            new Date().toISOString().split("T")[0],
      );

      // All episodes are in the future, no valid last episode
      if (pastEpisodes.length === 0) return null;

      // Find the last aired episode
      lastEpisode = pastEpisodes[pastEpisodes.length - 1];
    }

    if (lastEpisode) {
      const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

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
        episode_type,
        title: lastEpisode.title,
        description: lastEpisode.description,
        id: lastEpisode.id,
        url: lastEpisode.url,
        release_date: lastEpisode.release_date,
        users_rating: lastEpisode.users_rating,
      };
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getLastEpisode");
  }

  return lastEpisodeDetails;
};

module.exports = { getLastEpisode };
