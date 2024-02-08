const { config } = require("./config");
const { getCheerioContent } = require("./utils/getCheerioContent");
const { logErrors } = require("./utils/logErrors");

/**
 * Retrieves the Letterboxd rating for a given movie.
 * @param {string} letterboxdHomepage - The Letterboxd homepage URL.
 * @param {string} letterboxdId - The Letterboxd ID for the movie.
 * @returns {Promise<Object>} - An object containing the Letterboxd rating information.
 * @throws {Error} - If there is an error retrieving the Letterboxd rating.
 */
const getLetterboxdRating = async (letterboxdHomepage, letterboxdId) => {
  let letterboxdObj = null;
  let errorCounter = 0;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    if (letterboxdId !== "null") {
      $ = await getCheerioContent(`${letterboxdHomepage}`, options);
      let usersRating = parseFloat(
        $('meta[name="twitter:data2"]')
          .attr("content")
          .match(/(\d+\.\d+)/)[0]
      );
      if (isNaN(usersRating)) usersRating = null;

      letterboxdObj = {
        id: letterboxdId,
        url: letterboxdHomepage,
        usersRating: usersRating,
      };
    }

    errorCounter = 0;
  } catch (error) {
    logErrors(errorCounter, error, letterboxdHomepage);
  }

  return letterboxdObj;
};

module.exports = { getLetterboxdRating };
