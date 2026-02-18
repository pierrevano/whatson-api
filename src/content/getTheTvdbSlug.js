const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const { config } = require("../config");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves TheTVDB slug for a given movie or tvshow.
 * @param {string} allocineHomepage - AlloCiné homepage URL.
 * @param {string} theTvdbId - TheTVDB ID for the tvshow or movie.
 * @returns {Promise<string|null>} The TheTVDB slug, or null if it cannot be retrieved.
 */
const getTheTvdbSlug = async (allocineHomepage, theTvdbId) => {
  let theTvdbSlug = null;
  let slugUrl = null;

  try {
    if (isNotNull(theTvdbId)) {
      const type = allocineHomepage.includes(config.baseURLTypeSeries)
        ? "series"
        : "movies";
      slugUrl = `${config.baseURLTheTVDBAPI}/${type}/${theTvdbId}`;

      axiosRetry(axios, {
        retries: config.retries,
        retryDelay: () => config.retryDelay,
        retryCondition: (error) => {
          if (
            error?.config?.url === slugUrl &&
            error?.response?.status !== 200
          ) {
            return true;
          }

          return axiosRetry.isNetworkOrIdempotentRequestError(error);
        },
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
      const { data } = await axios.get(slugUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: (status) => status === 200,
      });

      theTvdbSlug = data?.data?.slug;

      if (!theTvdbSlug) theTvdbSlug = null;
    }
  } catch (error) {
    if (
      slugUrl &&
      error?.config?.url === slugUrl &&
      error?.response?.status !== 200
    ) {
      console.error(
        `Failed to fetch TheTVDB slug after ${config.retries} retries. Status: ${
          error?.response?.status ?? "unknown"
        }`,
      );
      process.exit(1);
    }

    logErrors(error, allocineHomepage, "getTheTvdbSlug");
  }

  return theTvdbSlug;
};

module.exports = { getTheTvdbSlug };
