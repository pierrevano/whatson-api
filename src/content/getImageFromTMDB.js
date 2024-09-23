const { getTMDBResponse } = require("../getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the image path for a movie or tvshow from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tvshow on AlloCiné.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns {Promise<string|null>} - A promise that resolves with the image path or null if there was an error.
 */
const getImageFromTMDB = async (allocineHomepage, tmdbId) => {
  let imagePath = null;

  try {
    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

    imagePath = data?.poster_path || data?.profile_path || null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getImageFromTMDB");
  }

  return imagePath;
};

module.exports = { getImageFromTMDB };
