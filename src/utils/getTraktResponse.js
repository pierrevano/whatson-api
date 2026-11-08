const { config } = require("../config");
const {
  getHomepageResponseWithRateLimitRetry,
} = require("./getHomepageResponseWithRateLimitRetry");
const { isNotNull } = require("./isNotNull");
const { logErrors } = require("./logErrors");

/**
 * Retrieves metadata for a movie or TV show from Trakt.
 *
 * @param {string} allocineHomepage - Source URL used to determine the item type.
 * @param {string} traktHomepage - Provider URL used for error reporting.
 * @param {number|string|null} traktId - Provider identifier or slug.
 * @returns {Promise<import("axios").AxiosResponse|null>}
 * The response, or null when no identifier is provided.
 */
const getTraktResponse = async (allocineHomepage, traktHomepage, traktId) => {
  try {
    if (!isNotNull(traktId)) return null;

    const type = allocineHomepage.includes(config.baseURLTypeSeries)
      ? "shows"
      : "movies";
    const apiUrl = `${config.baseURLTraktAPI}/${type}/${traktId}?extended=full`;

    return await getHomepageResponseWithRateLimitRetry(apiUrl, {
      serviceName: "Trakt",
      id: traktId,
      allowedStatuses: [200, 429],
      requestConfig: {
        headers: {
          "trakt-api-key": config.traktApiKey,
          "trakt-api-version": 2,
        },
      },
    });
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktResponse");
  }
};

module.exports = { getTraktResponse };
