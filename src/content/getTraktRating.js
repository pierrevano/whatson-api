const { config } = require("../config");
const { getHomepageResponse } = require("../utils/getHomepageResponse");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes a traktHomepage and allocineHomepage as arguments, and returns the usersRating and usersRatingCount of the item.
 * It only attempts to fetch and parse the content if a valid traktId is provided.
 * The data is retrieved from the Trakt API using the appropriate media type (movie or show).
 *
 * @param {string} allocineHomepage - The URL of the item's page on allocine.fr
 * @param {string} traktHomepage - The URL of the item's page on trakt.tv
 * @param {string} traktId - The Trakt ID for the movie or TV show
 * @returns {{ id: string, url: string, usersRating: number|null, usersRatingCount: number|null, tagline: string|null }|null} An object containing the Trakt rating information, or null if not available
 */
const getTraktRating = async (allocineHomepage, traktHomepage, traktId) => {
  let traktObj = null;

  try {
    if (isNotNull(traktId)) {
      const type = allocineHomepage.includes(config.baseURLTypeSeries)
        ? "shows"
        : "movies";

      const apiUrl = `${config.baseURLTraktAPI}/${type}/${traktId}?extended=full`;
      const response = await getHomepageResponse(apiUrl, {
        serviceName: "Trakt API",
        id: traktId,
        requestConfig: {
          headers: {
            "trakt-api-key": config.traktApiKey,
            "trakt-api-version": 2,
          },
        },
      });

      const data = response?.data;

      const usersRating = data?.rating ? Math.round(data.rating * 10) : null;
      const usersRatingCount = data?.votes ? parseInt(data.votes) : null;
      const tagline =
        data?.tagline && data?.tagline.trim() !== "" ? data.tagline : null;
      if (!usersRatingCount || usersRatingCount === 0) return null;

      traktObj = {
        id: traktId,
        url: traktHomepage,
        usersRating,
        usersRatingCount,
        tagline,
      };
    }
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktRating");
  }

  return traktObj;
};

module.exports = { getTraktRating };
