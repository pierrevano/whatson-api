const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the full image URL for a movie or tvshow from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tvshow on AlloCiné.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string|null>} - A promise that resolves with the full image URL or null if there was an error.
 */
const getImage = async (allocineHomepage, data) => {
  let image = null;
  const baseURL = "https://image.tmdb.org/t/p/w1280";

  try {
    const imagePath = data?.poster_path || data?.profile_path || null;

    if (imagePath) {
      image = `${baseURL}${imagePath}`;
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getImage");
  }

  return image;
};

/**
 * Retrieves image variants from provider-specific metadata.
 *
 * @param {string} allocineHomepage - The homepage of the movie or tvshow on AlloCiné.
 * @param {object} allocineFirstInfo - AlloCiné metadata payload.
 * @returns {Promise<Record<string, string|null>>} Image variants keyed by locale.
 */
const getImageVariants = async (allocineHomepage, allocineFirstInfo) => {
  try {
    return {
      fr: allocineFirstInfo?.image || null,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getImageVariants");
  }

  return {
    fr: null,
  };
};

module.exports = { getImage, getImageVariants };
