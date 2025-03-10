const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves TMDB rating for a given movie or tvshow.
 * @param {string} allocineHomepage - Allocine homepage URL.
 * @param {string} tmdbHomepage - TMDB homepage URL.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns {Promise<Object>} - An object containing TMDB rating information.
 * @throws {Error} - If there is an error retrieving rating from TMDB.
 */
const getTmdbRating = async (allocineHomepage, tmdbHomepage, tmdbId) => {
  let tmdbObj = null;

  try {
    if (isNotNull(tmdbId)) {
      const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

      const usersRating = parseFloat(data.vote_average.toFixed(2));
      tmdbObj = {
        id: tmdbId,
        url: tmdbHomepage,
        usersRating: usersRating === 0 ? null : usersRating,
      };
    }
  } catch (error) {
    logErrors(error, tmdbHomepage, "getTmdbRating");
  }

  return tmdbObj;
};

module.exports = { getTmdbRating };
