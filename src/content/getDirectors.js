const { logErrors } = require("../utils/logErrors");

const directorsCount = {};

/**
 * Retrieves the director names for a movie or tvshow from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or tvshow on AlloCiné.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string[]|null>} Director names, or null when none are available. Errors are passed to logErrors.
 */
const getDirectors = async (allocineHomepage, data) => {
  let directorNames = null;

  try {
    const directors =
      data?.credits?.crew
        ?.filter((crewMember) => crewMember.job === "Director")
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

  return directorNames;
};

module.exports = { getDirectors };
