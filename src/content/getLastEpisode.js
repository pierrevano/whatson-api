const { config } = require("../config");
const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the last episode to have aired for a given tvshow, including its episode type from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {Array<Object>} episodesDetails - Array of episode metadata objects for the tvshow.
 * @param {number} tmdbId - TMDB ID for the tvshow.
 * @returns {Promise<Object|null>} A promise that resolves to an object containing the last episode's details, or null if no valid episode is found.
 */
const getLastEpisode = async (allocineHomepage, episodesDetails, tmdbId) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let lastEpisodeDetails = null;

  try {
    if (Array.isArray(episodesDetails) && episodesDetails.some((ep) => ep)) {
      const today = new Date().toISOString().split("T")[0];

      const pastEpisodes = episodesDetails.filter(
        (ep) =>
          ep?.release_date &&
          new Date(ep.release_date).toISOString().split("T")[0] <= today,
      );

      // All episodes are in the future, no valid last episode
      if (pastEpisodes.length === 0) return null;

      let lastEpisode = pastEpisodes[pastEpisodes.length - 1];
      const secondToLast = pastEpisodes[pastEpisodes.length - 2];

      /*
       * Use the second-to-last episode instead, but only if the most recent
       * episode airs today and the previous episode has a different release date
       */
      if (
        lastEpisode.release_date === today &&
        secondToLast &&
        secondToLast.release_date !== today
      ) {
        lastEpisode = secondToLast;
      }

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
