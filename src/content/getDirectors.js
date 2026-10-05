const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves director names from the item metadata.
 * @param {string} allocineHomepage - The homepage of the movie or tvshow on AlloCiné.
 * @param {object} data - The item metadata.
 * @param {object} [tmdbData] - TMDB data.
 * @param {object} [imdbCredits] - IMDb credits.
 * @returns {Promise<string[]|null>} Director names, or null when none are available. Errors are passed to logErrors.
 */
const getDirectors = async (allocineHomepage, data, tmdbData, imdbCredits) => {
  try {
    const director = data?.director;
    const allocineDirectors =
      data?.directors ||
      (Array.isArray(director) ? director : [director])
        .map((person) => person?.name)
        .filter((name) => typeof name === "string" && name.trim());
    if (allocineDirectors.length) return [...new Set(allocineDirectors)];

    if (imdbCredits?.directors?.length) return imdbCredits.directors;

    const tmdbDirectors = tmdbData?.credits?.crew
      ?.filter((crewMember) => crewMember.job === "Director")
      .map((director) => director.name);
    return tmdbDirectors?.length ? [...new Set(tmdbDirectors)] : null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getDirectors");
  }
};

module.exports = { getDirectors };
