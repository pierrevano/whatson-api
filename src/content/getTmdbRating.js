const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Extracts the usersRating and usersRatingCount from the provided TMDB response.
 * Requires a valid tmdbId and a nonzero vote count.
 *
 * @param {string} tmdbHomepage - The URL of the item's page on themoviedb.org
 * @param {number} tmdbId - TMDB ID for the movie or tvshow
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<{ id: number, url: string, usersRating: number|null, usersRatingCount: number|null }|null>} An object containing the TMDB rating information, or null if not available
 */
const getTmdbRating = async (tmdbHomepage, tmdbId, data) => {
  let tmdbObj = null;

  try {
    if (isNotNull(tmdbId)) {
      const usersRating = data?.vote_average
        ? parseFloat(data.vote_average.toFixed(2))
        : null;
      const usersRatingCount = data?.vote_count
        ? parseInt(data.vote_count)
        : null;
      if (!usersRatingCount || usersRatingCount === 0) return null;

      tmdbObj = {
        id: tmdbId,
        url: tmdbHomepage,
        usersRating,
        usersRatingCount,
      };
    }
  } catch (error) {
    logErrors(error, tmdbHomepage, "getTmdbRating");
  }

  return tmdbObj;
};

module.exports = { getTmdbRating };
