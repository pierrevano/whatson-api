const { config } = require("../config");
const { getEpisodesDetails } = require("./getEpisodesDetails");
const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the last episode to air for a given tvshow from The Movie Database API.
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

    if (data && data.last_episode_to_air) {
      const {
        overview: description = null,
        air_date = null,
        episode_number: episode = null,
        episode_type = null,
        season_number: season = null,
      } = Object.fromEntries(
        Object.entries(data.last_episode_to_air).map(([key, value]) => [
          key,
          value !== "" ? value : null,
        ]),
      );

      const allEpisodesDetails = await getEpisodesDetails(
        allocineHomepage,
        imdbId,
        imdbHomepage,
      );

      let episodeDetails = null;
      if (
        Array.isArray(allEpisodesDetails) &&
        allEpisodesDetails.length > 0 &&
        allEpisodesDetails.some((ep) => ep)
      ) {
        // Find the last episode with a non-null users_rating
        episodeDetails = [...allEpisodesDetails]
          .reverse()
          .find((ep) => ep && ep.users_rating !== null);

        // If no such episode is found, fallback to the last episode
        if (!episodeDetails) {
          episodeDetails = allEpisodesDetails[allEpisodesDetails.length - 1];
        }
      }

      if (
        episodeDetails &&
        episodeDetails.season === season &&
        episodeDetails.episode === episode
      ) {
        lastEpisodeDetails = {
          title: episodeDetails.title,
          description,
          air_date,
          episode,
          episode_type,
          season,
          id: episodeDetails.id,
          url: episodeDetails.url,
          users_rating: episodeDetails.users_rating,
        };
      }
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getLastEpisode");
  }

  return lastEpisodeDetails;
};

module.exports = { getLastEpisode };
