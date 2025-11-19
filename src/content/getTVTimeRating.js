const { appendFile } = require("fs");
const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * It takes a tvtimeHomepage as an argument, and returns the usersRating of the item.
 * It only attempts to fetch and parse the content if a valid tvtimeId is provided.
 * The data is retrieved from the unofficial TV Time API through a proxy endpoint with automatic retries.
 *
 * @param {string} tvtimeHomepage - The URL of the item's page on tvtime.com
 * @param {string} tvtimeId - The TV Time ID for the TV show
 * @returns {{ id: string, url: string, usersRating: number|null }|null} An object containing the TV Time rating information, or null if not available
 */
const getTVTimeRating = async (tvtimeHomepage, tvtimeId) => {
  let tvtimeObj = null;
  let usersRating = null;

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
    const apiUrl = `https://side-api.tvtime.com/sidecar/tvt?o=https://api2.tozelabs.com/v2/show/${tvtimeId}?fields%3Drating`;

    for (let attempt = 1; attempt <= config.retries; attempt += 1) {
      try {
        const response = await axios.get(apiUrl, options);

        if (response.data?.rating) {
          usersRating = parseFloat(response.data.rating);
        }

        if (isNaN(usersRating)) usersRating = null;

        if (usersRating === null) tvtimeObj = null;

        tvtimeObj = {
          id: tvtimeId,
          url: tvtimeHomepage,
          usersRating: usersRating,
        };

        return tvtimeObj;
      } catch (error) {
        const canRetry = attempt < config.retries;

        if (canRetry) {
          const attemptLog = `getTVTimeRating - ${
            tvtimeHomepage || tvtimeId || "unknown"
          }: Request failed (attempt ${attempt}). Retrying...`;
          console.log(attemptLog);
          appendFile(
            "temp_error.log",
            `${new Date().toISOString()} - ${attemptLog}\n`,
            () => {},
          );
          await delay(config.retryDelay);
        } else {
          logErrors(error, tvtimeHomepage, "getTVTimeRating");
        }
      }
    }
  }

  return tvtimeObj;
};

module.exports = { getTVTimeRating };
