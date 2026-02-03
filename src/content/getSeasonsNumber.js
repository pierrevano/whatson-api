const { config } = require("../config");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the number of seasons for a tvshow from TMDB.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<number|null>} - A promise that resolves with the TMDB number of seasons, or null if the number cannot be determined.
 */
const getSeasonsNumber = async (allocineHomepage, data) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let seasonsNumber = null;

  try {
    seasonsNumber = Number(data?.number_of_seasons);
    if (Number.isNaN(seasonsNumber)) {
      seasonsNumber = null;
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getSeasonsNumber");
  }

  return seasonsNumber;
};

module.exports = { getSeasonsNumber };
