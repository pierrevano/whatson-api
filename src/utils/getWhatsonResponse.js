const axios = require("axios");

const { config } = require("../config");
const { logErrors } = require("./logErrors");

/**
 * Fetches data from the What's on? API for a given IMDb title ID.
 *
 * @async
 * @function getWhatsonResponse
 * @param {string} imdbId - The IMDb title ID to query.
 * @param {string} [appendToResponse] - Optional comma-separated fields (e.g., `episodes_details`) to append to the response.
 * @returns {Promise<Object|null|undefined>} Resolves with the first result object when present,
 *     `null` when no results are found, or `undefined` when the request fails before a response is returned.
 *     The process exits with code 1 when the remote answers with a non-200 status.
 */
const getWhatsonResponse = async (imdbId, appendToResponse) => {
  try {
    const appendParam = appendToResponse
      ? `&append_to_response=${appendToResponse}`
      : "";
    const apiUrl = `${config.baseURLRemote}/?imdbId=${imdbId}&api_key=${config.internalApiKey}${appendParam}`;
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
