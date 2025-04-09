const { config } = require("../config");
const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { getWhatsonResponse } = require("../utils/getWhatsonResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the next episode to air for a given tvshow, including its episode type from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {Array<Object>} episodesDetails - Array of episode objects for the tvshow.
 * @param {string} imdbId - IMDb ID for the tvshow.
 * @param {number} tmdbId - TMDB ID for the tvshow.
 * @returns {Promise<Object|null>} A promise that resolves to an object containing the next episode's details, or null if no valid next episode is found.
 */
const getNextEpisode = async (
  allocineHomepage,
  episodesDetails,
  imdbId,
  tmdbId,
) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let nextEpisodeDetails = null;

  try {
    let lastRatedEpisodeIndex = -1;

    if (
      Array.isArray(episodesDetails) &&
      episodesDetails.some((ep) => ep?.users_rating !== null)
    ) {
      lastRatedEpisodeIndex = episodesDetails.findLastIndex(
        (ep) => ep?.users_rating !== null,
      );
    }

    if (
      lastRatedEpisodeIndex !== -1 &&
      lastRatedEpisodeIndex < episodesDetails.length - 1
    ) {
      const nextEpisode = episodesDetails[lastRatedEpisodeIndex + 1];

      const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

      let episode_type = null;
      if (data?.next_episode_to_air) {
        const {
          season_number,
          episode_number,
          episode_type: type,
        } = data.next_episode_to_air;

        if (
          season_number === nextEpisode.season &&
          episode_number === nextEpisode.episode
        ) {
          episode_type = type;
        }
      }

      if (nextEpisode && nextEpisode.release_date) {
        const currentDate = new Date().toISOString().split("T")[0];
        const releaseDate = new Date(nextEpisode.release_date)
          .toISOString()
          .split("T")[0];

        if (
          releaseDate >= currentDate &&
          (await getWhatsonResponse(imdbId)).status !== "Ended"
        ) {
          nextEpisodeDetails = {
            season: nextEpisode.season,
            episode: nextEpisode.episode,
            episode_type,
            title: nextEpisode.title,
            description: nextEpisode.description,
            id: nextEpisode.id,
            url: nextEpisode.url,
            release_date: nextEpisode.release_date,
            users_rating: nextEpisode.users_rating,
          };
        }
      }
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getNextEpisode");
  }

  return nextEpisodeDetails;
};

module.exports = { getNextEpisode };
