const { config } = require("../config");
const { getEpisodesDetails } = require("./getEpisodesDetails");
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
const getLastEpisode = async (
  allocineHomepage,
  imdbHomepage,
  imdbId,
  tmdbId,
) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let lastEpisodeDetails = null;

  try {
    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

    const episode_type =
      data && data.last_episode_to_air && data.last_episode_to_air.episode_type
        ? data.last_episode_to_air.episode_type
        : null;

    const allEpisodesDetails = await getEpisodesDetails(
      allocineHomepage,
      imdbId,
      imdbHomepage,
    );

    let lastEpisode = null;

    if (
      Array.isArray(allEpisodesDetails) &&
      allEpisodesDetails.length > 0 &&
      allEpisodesDetails.some((ep) => ep)
    ) {
      // Find the last episode with a non-null users_rating
      lastEpisode = [...allEpisodesDetails]
        .reverse()
        .find((ep) => ep && ep.users_rating !== null);

      // If no such episode is found, fallback to the last episode
      if (!lastEpisode) {
        lastEpisode = allEpisodesDetails[allEpisodesDetails.length - 1];
      }
    }

    if (lastEpisode) {
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
