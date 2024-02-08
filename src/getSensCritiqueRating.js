const { config } = require("./config");
const { getCheerioContent } = require("./utils/getCheerioContent");
const { logErrors } = require("./utils/logErrors");

/**
 * Retrieves the SensCritique rating for a given movie or tv show.
 * @param {string} sensCritiqueHomepage - The SensCritique homepage URL.
 * @param {string} sensCritiqueId - The SensCritique ID for the movie or tv show.
 * @returns {Promise<Object>} - An object containing the SensCritique rating information.
 * @throws {Error} - If there is an error retrieving the SensCritique rating.
 */
const getSensCritiqueRating = async (sensCritiqueHomepage, sensCritiqueId) => {
  let sensCritiqueObj = null;
  let errorCounter = 0;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    if (sensCritiqueId !== "null") {
      $ = await getCheerioContent(`${sensCritiqueHomepage}`, options);
      let usersRating = parseFloat($('[data-testid="Rating"]').first().text());
      if (isNaN(usersRating)) usersRating = null;

      sensCritiqueObj = {
        id: sensCritiqueId,
        url: sensCritiqueHomepage,
        usersRating: usersRating,
      };
    }

    errorCounter = 0;
  } catch (error) {
    logErrors(errorCounter, error, sensCritiqueHomepage);
  }

  return sensCritiqueObj;
};

module.exports = { getSensCritiqueRating };
