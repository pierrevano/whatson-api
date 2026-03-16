const { config } = require("../config");
const { getRankedEpisode } = require("../utils/episodeRanking");
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
    lowestRatedEpisode = getRankedEpisode(episodesDetails, "asc");
  } catch (error) {
    logErrors(error, allocineHomepage, "getLowestRatedEpisode");
  }

  return lowestRatedEpisode;
};

module.exports = { getLowestRatedEpisode };
