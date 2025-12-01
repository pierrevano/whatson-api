const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Extracts the TMDB popularity score from the TMDB API response.
 * Uses the already-fetched TMDB payload to avoid extra network calls.
 *
 * @param {string} tmdbHomepage - The URL of the item's TMDB page.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<{ popularity: number|null }|undefined>} The TMDB popularity value, or undefined on failure.
 */
const getTmdbPopularity = async (tmdbHomepage, tmdbId, data) => {
  try {
    if (!isNotNull(tmdbId) || !data) {
      return { popularity: null };
    }

    const rawPopularity = data?.popularity;
    const popularity =
      typeof rawPopularity === "number" && Number.isFinite(rawPopularity)
        ? parseFloat(rawPopularity.toFixed(2))
        : null;

    return { popularity };
  } catch (error) {
    logErrors(error, tmdbHomepage, "getTmdbPopularity");
  }
};

module.exports = { getTmdbPopularity };
