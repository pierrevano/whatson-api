const { logErrors } = require("../utils/logErrors");
const { writeItemsNumber } = require("../utils/writeItems");

const genresCount = {};

/**
 * Retrieves the genre names for a movie or tvshow from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tv show on AlloCiné.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string[]|null>} Genre names, or null when genre data is unavailable. Errors are passed to logErrors.
 */
const getGenres = async (allocineHomepage, data) => {
  let genreNames = null;

  try {
    genreNames =
      data?.genres?.map((genre) => {
        const genreName = genre.name;
        genresCount[genreName] = (genresCount[genreName] || 0) + 1;
        return genreName;
      }) || null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getGenres");
  }

  writeItemsNumber(allocineHomepage, genresCount, "genres");

  return genreNames;
};

module.exports = { getGenres };
