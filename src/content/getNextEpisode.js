const { config } = require("../config");
const { getEpisodesDetails } = require("./getEpisodesDetails");
const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the next episode to air for a given tvshow and the episode type from The Movie Database API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {number} tmdbId - TMDB ID for the tvshow.
 * @param {string} imdbId - IMDb ID for the tvshow.
 * @param {string} imdbHomepage - IMDb homepage URL for the tvshow.
 * @returns {Promise<Object|null>} - A promise that resolves with the details of the next episode or null if the details cannot be determined.
 */
const getNextEpisode = async (
  allocineHomepage,
  imdbHomepage,
  imdbId,
  tmdbId,
) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let nextEpisodeDetails = null;

  try {
    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

    const episode_type =
      data && data.next_episode_to_air && data.next_episode_to_air.episode_type
        ? data.next_episode_to_air.episode_type
        : null;

    const allEpisodesDetails = await getEpisodesDetails(
      allocineHomepage,
      imdbId,
      imdbHomepage,
    );

    let lastRatedEpisodeIndex = -1;

    if (
      Array.isArray(allEpisodesDetails) &&
      allEpisodesDetails.length > 0 &&
      allEpisodesDetails.some((ep) => ep?.users_rating !== null)
    ) {
      lastRatedEpisodeIndex = allEpisodesDetails.findLastIndex(
        (ep) => ep?.users_rating !== null,
      );
    }

    if (
      lastRatedEpisodeIndex !== -1 &&
      lastRatedEpisodeIndex < allEpisodesDetails.length - 1
    ) {
      const nextEpisode = allEpisodesDetails[lastRatedEpisodeIndex + 1];
      if (nextEpisode && nextEpisode.release_date) {
        const currentDate = new Date();
        const releaseDate = new Date(nextEpisode.release_date);

        const currentDateOnly = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
        );
        const releaseDateOnly = new Date(
          releaseDate.getFullYear(),
          releaseDate.getMonth(),
          releaseDate.getDate(),
        );

        if (releaseDateOnly >= currentDateOnly) {
          nextEpisodeDetails = {
            season: nextEpisode.season,
            episode: nextEpisode.episode,
            episode_type: episode_type,
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
