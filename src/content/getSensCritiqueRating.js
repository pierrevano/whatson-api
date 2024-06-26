const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the SensCritique rating for a given movie or tvshow.
 * @param {string} sensCritiqueHomepage - The SensCritique homepage URL.
 * @param {string} sensCritiqueId - The SensCritique ID for the movie or tvshow.
 * @returns {Promise<Object>} - An object containing the SensCritique rating information.
 * @throws {Error} - If there is an error retrieving the SensCritique rating.
 */
const getSensCritiqueRating = async (sensCritiqueHomepage, sensCritiqueId) => {
  let sensCritiqueObj = null;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };

    if (isNotNull(sensCritiqueId)) {
      $ = await getCheerioContent(
        `${sensCritiqueHomepage}`,
        options,
        "getSensCritiqueRating",
      );
      let usersRating = parseFloat($('[data-testid="Rating"]').first().text());
      if (isNaN(usersRating)) usersRating = null;

      sensCritiqueObj = {
        id: sensCritiqueId,
        url: sensCritiqueHomepage,
        usersRating: usersRating,
      };
    }
  } catch (error) {
    logErrors(error, sensCritiqueHomepage, "getSensCritiqueRating");
  }

  return sensCritiqueObj;
};

module.exports = { getSensCritiqueRating };
