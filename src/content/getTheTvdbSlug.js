const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const { config } = require("../config");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves TheTVDB slug for a given movie or tvshow.
 * @param {string} allocineHomepage - Allocine homepage URL.
 * @param {string} theTvdbId - TheTVDB ID for the tvshow or movie.
 * @returns {Promise<Object>} - An object containing TheTVDB information.
 * @throws {Error} - If there is an error retrieving data from TheTVDB.
 */
const getTheTvdbSlug = async (allocineHomepage, theTvdbId) => {
  let theTvdbSlug = null;

  try {
    if (isNotNull(theTvdbId)) {
      const type = allocineHomepage.includes(config.baseURLTypeSeries)
        ? "series"
        : "movies";

      axiosRetry(axios, {
        retries: config.retries,
        retryDelay: () => config.retryDelay,
      });

      // Step 1: Login to TheTVDB API to get access token
      const loginResponse = await axios.post(
        `${config.baseURLTheTVDBAPI}/login`,
        { apikey: config.theTvdbApiKey },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (loginResponse.status !== 200) {
        throw new Error("Failed to login to TheTVDB API.");
      }

      const accessToken = loginResponse.data.data.token;

      // Step 2: Fetch movie or tvshow details using TheTVDB API
      const { data } = await axios.get(
        `${config.baseURLTheTVDBAPI}/${type}/${theTvdbId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      theTvdbSlug = data?.data?.slug;

      if (!theTvdbSlug) theTvdbSlug = null;
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getTheTvdbSlug");
  }

  return theTvdbSlug;
};

module.exports = { getTheTvdbSlug };
