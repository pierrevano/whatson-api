const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the Trakt rating for a given movie or tvshow.
 * @param {string} traktHomepage - The Trakt homepage URL.
 * @param {string} traktId - The Trakt ID for the movie or tvshow.
 * @returns {Promise<Object>} - An object containing the Trakt rating information.
 * @throws {Error} - If there is an error retrieving the Trakt rating.
 */
const getTraktRating = async (traktHomepage, traktId) => {
  let traktObj = null;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };

    if (isNotNull(traktId)) {
      const $ = await getCheerioContent(
        `${traktHomepage}`,
        options,
        "getTraktRating",
      );
      let usersRating = parseInt(
        $(".trakt-rating .rating").text().replace("%", ""),
      );
      if (isNaN(usersRating) || usersRating === 0) usersRating = null;
      let tagline = $("#tagline").text();
      if (!tagline) tagline = null;

      traktObj = {
        id: traktId,
        url: traktHomepage,
        usersRating: usersRating,
        tagline: tagline,
      };
    }
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktRating");
  }

  return traktObj;
};

module.exports = { getTraktRating };
