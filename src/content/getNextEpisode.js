const { config } = require("../config");
const { formatDate } = require("../utils/formatDate");
const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");
const { getAllocineInfo } = require("./getAllocineInfo");

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
  betaseriesHomepage,
  episodesDetails,
  lastEpisode,
  tmdbId,
) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let nextEpisodeDetails = null;

  try {
    const futureEpisodes = Array.isArray(episodesDetails)
      ? episodesDetails.filter(
          (ep) =>
            ep?.release_date &&
            formatDate(ep.release_date) >= formatDate(new Date()),
        )
      : [];

    if (futureEpisodes.length === 0) return null;

    const nextEpisode = futureEpisodes[0];

    // Ensure the next episode is always after the last episode
    const isAfter = (nEpisode, lEpisode) => {
      if (!nEpisode || !lEpisode) return true;
      if (nEpisode.season > lEpisode.season) return true;
      if (
        nEpisode.season === lEpisode.season &&
        nEpisode.episode > lEpisode.episode
      )
        return true;
      return false;
    };

    if (!isAfter(nextEpisode, lastEpisode)) return null;

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

    if (
      (
        await getAllocineInfo(
          allocineHomepage,
          betaseriesHomepage,
          tmdbId,
          false,
        )
      ).status !== "Ended"
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
        users_rating_count: nextEpisode.users_rating_count,
      };
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getNextEpisode");
  }

  return nextEpisodeDetails;
};

module.exports = { getNextEpisode };
