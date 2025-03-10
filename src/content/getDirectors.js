const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { logErrors } = require("../utils/logErrors");
const { writeItemsNumber } = require("../utils/writeItemsNumber");

const directorsCount = {};

/**
 * Retrieves the director names for a movie or tvshow from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tvshow on AlloCiné.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns {Promise<string[]|null>} - A promise that resolves with an array of director names or null if there was an error.
 */
const getDirectors = async (allocineHomepage, tmdbId) => {
  let directorNames = null;

  try {
    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

    const directors =
      data?.credits?.crew
        ?.filter((crewMember) => crewMember.department === "Directing")
        .map((director) => {
          const directorName = director.name;
          directorsCount[directorName] =
            (directorsCount[directorName] || 0) + 1;
          return directorName;
        }) || [];
    directorNames = directors.length > 0 ? directors : null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getDirectors");
  }

  writeItemsNumber(allocineHomepage, directorsCount, "directors");

  return directorNames;
};

module.exports = { getDirectors };
