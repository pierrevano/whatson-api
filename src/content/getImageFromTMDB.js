const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the full image URL for a movie or tvshow from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tvshow on AlloCiné.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns {Promise<string|null>} - A promise that resolves with the full image URL or null if there was an error.
 */
const getImageFromTMDB = async (allocineHomepage, tmdbId) => {
  let image = null;
  const baseURL = "https://image.tmdb.org/t/p/w1280";

  try {
    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

    const imagePath = data?.poster_path || data?.profile_path || null;

    if (imagePath) {
      image = `${baseURL}${imagePath}`;
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getImageFromTMDB");
  }

  return image;
};

module.exports = { getImageFromTMDB };
