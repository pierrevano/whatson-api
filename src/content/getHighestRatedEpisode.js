const { config } = require("../config");
const { getRankedEpisode } = require("../utils/episodeRanking");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves details of the highest rated episode from a given list of episodes.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {Array<Object>} episodesDetails - Array of episode metadata objects.
 * @returns {Object|null} An object containing the highest-rated episode's details, or null if none found.
 */
const getHighestRatedEpisode = (allocineHomepage, episodesDetails) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let highestRatedEpisode = null;

  try {
    highestRatedEpisode = getRankedEpisode(episodesDetails, "desc");
  } catch (error) {
    logErrors(error, allocineHomepage, "getHighestRatedEpisode");
  }

  return highestRatedEpisode;
};

module.exports = { getHighestRatedEpisode };
