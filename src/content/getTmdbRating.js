const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes a tmdbHomepage and allocineHomepage as arguments, and returns the usersRating and usersRatingCount of the item.
 * It only attempts to fetch and parse the content if a valid tmdbId is provided.
 * The data is extracted from TheMovieDB API response, using the item's TMDB ID.
 *
 * @param {string} allocineHomepage - The URL of the item's page on allocine.fr
 * @param {string} tmdbHomepage - The URL of the item's page on themoviedb.org
 * @param {number} tmdbId - The TMDB ID for the movie or TV show
 * @returns {{ id: number, url: string, usersRating: number|null, usersRatingCount: number|null }|null} An object containing the TMDB rating information, or null if not available
 */
const getTmdbRating = async (allocineHomepage, tmdbHomepage, tmdbId) => {
  let tmdbObj = null;

  try {
    if (isNotNull(tmdbId)) {
      const response = await getTMDBResponse(allocineHomepage, tmdbId);
      const data = response?.data;

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
