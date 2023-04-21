const { getTMDBResponse } = require("./utils/getTMDBResponse");

/**
 * Retrieves the image path for a movie or TV show from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or TV show on Allocine.
 * @param {number} theMoviedbId - The ID of the movie or TV show on TMDB.
 * @returns {Promise<string|null>} - A promise that resolves with the image path or null if there was an error.
 */
const getImageFromTMDB = async (allocineHomepage, theMoviedbId) => {
  try {
    const { data, status } = await getTMDBResponse(allocineHomepage, theMoviedbId);
    let image_path = data.poster_path || data.profile_path;
    if (status !== 200) image_path = null;

    return image_path;
  } catch (error) {
    console.log(`getImageFromTMDB - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getImageFromTMDB };
