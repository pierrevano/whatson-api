const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the TV Time rating for a given tvshow.
 * @param {string} tvtimeHomepage - The TV Time homepage URL.
 * @param {string} tvtimeId - The TV Time ID for the tvshow.
 * @returns {Promise<Object>} - An object containing the TV Time rating information.
 * @throws {Error} - If there is an error retrieving the TV Time rating.
 */
const getTVTimeRating = async (tvtimeHomepage, tvtimeId) => {
  let tvtimeObj = null;
  let usersRating = null;

  try {
    axiosRetry(axios, {
      retries: config.retries,
      retryDelay: () => config.retryDelay,
    });

    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
      validateStatus: (status) => status < 500,
    };

    if (isNotNull(tvtimeId)) {
      const apiUrl = `https://side-api.tvtime.com/sidecar/tvt?o=https://api2.tozelabs.com/v2/cacheable/show/${tvtimeId}?fields%3Drating`;
      const response = await axios.get(apiUrl, options);

      if (response.data && response.data.rating) {
        usersRating = parseFloat(response.data.rating);
      }

      if (isNaN(usersRating)) usersRating = null;

      if (usersRating === null) tvtimeObj = null;

      tvtimeObj = {
        id: tvtimeId,
        url: tvtimeHomepage,
        usersRating: usersRating,
      };
    }
  } catch (error) {
    logErrors(error, tvtimeHomepage, "getTVTimeRating");
  }

  return tvtimeObj;
};

module.exports = { getTVTimeRating };
