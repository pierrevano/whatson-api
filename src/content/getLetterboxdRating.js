const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the Letterboxd rating for a given movie.
 * @param {string} letterboxdHomepage - The Letterboxd homepage URL.
 * @param {string} letterboxdId - The Letterboxd ID for the movie.
 * @returns {Promise<Object>} - An object containing the Letterboxd rating information.
 * @throws {Error} - If there is an error retrieving the Letterboxd rating.
 */
const getLetterboxdRating = async (letterboxdHomepage, letterboxdId) => {
  let letterboxdObj = null;
  let usersRating = null;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    if (isNotNull(letterboxdId)) {
      $ = await getCheerioContent(
        `${letterboxdHomepage}`,
        options,
        "getLetterboxdRating",
      );

      let metaContent = $('meta[name="twitter:data2"]');
      if (metaContent.length)
        usersRating = parseFloat(
          metaContent.attr("content").match(/(\d+\.\d+)/)[0],
        );

      if (isNaN(usersRating)) usersRating = null;

      letterboxdObj = {
        id: letterboxdId,
        url: letterboxdHomepage,
        usersRating: usersRating,
      };
    }
  } catch (error) {
    logErrors(error, letterboxdHomepage, "getLetterboxdRating");
  }

  return letterboxdObj;
};

module.exports = { getLetterboxdRating };
