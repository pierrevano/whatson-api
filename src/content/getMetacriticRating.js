const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the Metacritic rating for a given movie or tv show.
 * @param {string} metacriticHomepage - The Metacritic homepage URL.
 * @param {string} metacriticId - The Metacritic ID for the movie or tv show.
 * @returns {Promise<Object>} - An object containing the Metacritic rating information.
 * @throws {Error} - If there is an error retrieving the Metacritic rating.
 */
const getMetacriticRating = async (metacriticHomepage, metacriticId) => {
  let metacriticObj = null;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    if (isNotNull(metacriticId)) {
      $ = await getCheerioContent(`${metacriticHomepage}`, options, "getMetacriticRating");
      let usersRating = parseFloat($(".c-siteReviewScore_user span").first().text());
      if (isNaN(usersRating)) usersRating = null;

      $ = await getCheerioContent(`${metacriticHomepage}/critic-reviews`, options, "getMetacriticRating");
      let criticsRating = parseInt($(".c-siteReviewScore span").first().text());
      if (isNaN(criticsRating)) criticsRating = null;

      metacriticObj = {
        id: metacriticId,
        url: metacriticHomepage,
        usersRating: usersRating,
        criticsRating: criticsRating,
      };
    }
  } catch (error) {
    logErrors(error, metacriticHomepage, "getMetacriticRating");
  }

  return metacriticObj;
};

module.exports = { getMetacriticRating };
