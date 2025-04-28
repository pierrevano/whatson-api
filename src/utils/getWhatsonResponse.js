const axios = require("axios");

const { config } = require("../config");
const { logErrors } = require("./logErrors");

/**
 * Fetches data from the What's on? API for a given IMDb title ID.
 *
 * @async
 * @function getWhatsonResponse
 * @param {string} imdbId - The IMDb title ID to query.
 * @returns {Promise<Object|null>} - Returns the first result object from the API response,
 *                                        or `null` if no results are found or an error occurs.
 * @throws {Error} - Throws an error and exits the process if the API response status is not 200.
 */
const getWhatsonResponse = async (imdbId) => {
  try {
    const apiUrl = `${config.baseURLRemote}/?imdbId=${imdbId}&api_key=${config.internalApiKey}`;
    const response = await axios.get(apiUrl);

    // Check if the status code is 200
    if (response.status !== 200) {
      console.error(
        `Failed to fetch What's on? API data: status code ${response.status}`,
      );
      process.exit(1);
    }

    if (
      response.data &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      return response.data.results[0];
    }

    return null;
  } catch (error) {
    logErrors(error, imdbId, "getWhatsonResponse");
  }
};

module.exports = { getWhatsonResponse };
