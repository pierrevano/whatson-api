const { config } = require("../config");
const { getTMDBResponse } = require("../getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the number of seasons for a given movie or tvshow from The Movie Database API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns {Promise<number|null>} - A promise that resolves with the number of seasons, or null if the number cannot be determined.
 */
const getSeasonsNumber = async (allocineHomepage, tmdbId) => {
  try {
    let seasonsNumber = null;

    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);
    if (data && data.number_of_seasons) seasonsNumber = data.number_of_seasons;
    if (isNaN(seasonsNumber)) seasonsNumber = null;

    return seasonsNumber;
  } catch (error) {
    logErrors(error, allocineHomepage, "getSeasonsNumber");
  }
};

module.exports = { getSeasonsNumber };
