const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the Trakt rating for a given movie or tv show.
 * @param {string} traktHomepage - The Trakt homepage URL.
 * @param {string} traktId - The Trakt ID for the movie or tv show.
 * @returns {Promise<Object>} - An object containing the Trakt rating information.
 * @throws {Error} - If there is an error retrieving the Trakt rating.
 */
const getTraktRating = async (traktHomepage, traktId) => {
  let traktObj = null;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    if (isNotNull(traktId)) {
      $ = await getCheerioContent(`${traktHomepage}`, options, "getTraktRating");
      let usersRating = parseInt($(".trakt-rating .rating").text().replace("%", ""));
      if (isNaN(usersRating)) usersRating = null;

      traktObj = {
        id: traktId,
        url: traktHomepage,
        usersRating: usersRating,
      };
    }
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktRating");
  }

  return traktObj;
};

module.exports = { getTraktRating };