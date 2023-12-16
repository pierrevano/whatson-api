const { getTMDBResponse } = require("./utils/getTMDBResponse");
const { logErrors } = require("./utils/logErrors");

/**
 * Retrieves the image path for a movie or tv show from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tv show on Allocine.
 * @param {number} theMoviedbId - The ID of the movie or tv show on TMDB.
 * @returns {Promise<string|null>} - A promise that resolves with the image path or null if there was an error.
 */
const getImageFromTMDB = async (allocineHomepage, theMoviedbId) => {
  let image_path = null;
  let errorCounter = 0;

  try {
    const { data, status } = await getTMDBResponse(allocineHomepage, theMoviedbId);
    image_path = data.poster_path || data.profile_path;
    if (status !== 200) image_path = null;

    errorCounter = 0;
  } catch (error) {
    logErrors(errorCounter, error, allocineHomepage);
  }

  return image_path;
};

module.exports = { getImageFromTMDB };
