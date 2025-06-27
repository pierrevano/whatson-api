const { config } = require("../config");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the number of seasons for a given tvshow from The Movie Database API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<number|null>} - A promise that resolves with the number of seasons, or null if the number cannot be determined.
 */
const getSeasonsNumber = async (allocineHomepage, data) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let seasonsNumber = null;

  try {
    seasonsNumber = data?.number_of_seasons || null;
    seasonsNumber = isNaN(seasonsNumber) ? null : seasonsNumber;
  } catch (error) {
    logErrors(error, allocineHomepage, "getSeasonsNumber");
  }

  return seasonsNumber;
};

module.exports = { getSeasonsNumber };
