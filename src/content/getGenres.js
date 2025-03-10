const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");
const { writeItemsNumber } = require("../utils/writeItemsNumber");

const genresCount = {};

/**
 * Retrieves the genre names for a movie or tvshow from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tv show on AlloCiné.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns {Promise<string[]|null>} - A promise that resolves with an array of genre names or null if there was an error.
 */
const getGenres = async (allocineHomepage, tmdbId) => {
  let genreNames = null;

  try {
    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

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
