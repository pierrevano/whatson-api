const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Extracts the TMDB popularity score from the TMDB API response.
 * Uses the already-fetched TMDB payload to avoid extra network calls.
 *
 * @param {string} tmdbHomepage - The URL of the item's TMDB page.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<{ popularity: number|null }>} The TMDB popularity value (null when missing or on failure).
 */
const getTmdbPopularity = async (tmdbHomepage, tmdbId, data) => {
  let popularity = null;

  try {
    if (isNotNull(tmdbId) && Number.isFinite(data?.popularity)) {
      popularity = parseFloat(data.popularity.toFixed(2));
    }
  } catch (error) {
    logErrors(error, tmdbHomepage, "getTmdbPopularity");
  }

  return { popularity };
};

module.exports = { getTmdbPopularity };
