const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the original title or original name from The Movie Database API.
 * For movies: original_title
 * For TV shows: original_name
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string|null>} - A promise that resolves with the original title or name, or null if it can't be determined.
 */
const getOriginalTitle = async (allocineHomepage, data) => {
  let originalTitle = null;

  try {
    // Movies use "original_title", TV shows use "original_name"
    originalTitle = data?.original_title || data?.original_name || null;

    if (typeof originalTitle !== "string") {
      originalTitle = null;
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getOriginalTitle");
  }

  return originalTitle;
};

module.exports = { getOriginalTitle };
