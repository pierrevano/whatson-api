const axios = require("axios");

const { config } = require("../config");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the Trakt rating for a given movie or tvshow.
 * @param {string} traktHomepage - The Trakt homepage URL.
 * @param {string} traktId - The Trakt ID for the movie or tvshow.
 * @returns {Promise<Object>} - An object containing the Trakt rating information.
 * @throws {Error} - If there is an error retrieving the Trakt rating.
 */
const getTraktRating = async (traktHomepage, traktId, allocineHomepage) => {
  let traktObj = null;

  try {
    if (isNotNull(traktId)) {
      const type = allocineHomepage.includes(config.baseURLTypeSeries)
        ? "shows"
        : "movies";

      const response = await axios.get(
        `${config.baseURLTraktAPI}/${type}/${traktId}?extended=full`,
        {
          headers: {
            "trakt-api-key": config.traktApiKey,
            "trakt-api-version": 2,
          },
        },
      );

      const { rating, tagline } = response.data;

      traktObj = {
        id: traktId,
        url: traktHomepage,
        usersRating: rating ? Math.round(rating * 10) : null,
        tagline: tagline && tagline.trim() !== "" ? tagline : null,
      };
    }
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktRating");
  }

  return traktObj;
};

module.exports = { getTraktRating };
