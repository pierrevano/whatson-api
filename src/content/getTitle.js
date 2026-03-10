const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the localized title from TMDB response payload.
 * For movies: `title`
 * For TV shows: `name`
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string|null>} Resolved title from TMDB or null.
 */
const getTitle = async (allocineHomepage, data) => {
  let title = null;

  try {
    title = data?.title || data?.name || null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getTitle");
  }

  return title;
};

/**
 * Retrieves title variants from provider-specific metadata.
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} allocineFirstInfo - AlloCiné metadata payload.
 * @returns {Promise<Record<string, string|null>>} Title variants keyed by locale.
 */
const getTitleVariants = async (allocineHomepage, allocineFirstInfo) => {
  try {
    return {
      fr: allocineFirstInfo?.allocineTitle || null,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getTitleVariants");
  }

  return {
    fr: null,
  };
};

module.exports = { getTitle, getTitleVariants };
