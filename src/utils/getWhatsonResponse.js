const axios = require("axios");

const { config } = require("../config");
const { logErrors } = require("./logErrors");

/**
 * Fetches data from the What's on? API for a given TMDB item.
 *
 * @async
 * @function getWhatsonResponse
 * @param {string} itemTypeApi - The type of item for the API (movie or tvshow).
 * @param {number} tmdbId - The TMDB ID to query.
 * @param {string} [appendToResponse] - Optional comma-separated fields (e.g., `episodes_details`) to append to the response.
 * @returns {Promise<Object|undefined>} Resolves with the axios response,
 *     or `undefined` when the request fails before a response is returned.
 */
const getWhatsonResponse = async (itemTypeApi, tmdbId, appendToResponse) => {
  try {
    const appendParam = appendToResponse
      ? `&append_to_response=${appendToResponse}`
      : "";
    const apiUrl = `${config.baseURLRemote}/${itemTypeApi}/${tmdbId}?api_key=${config.internalApiKey}${appendParam}`;
    const response = await axios.get(apiUrl, { validateStatus: () => true });
    if (![200, 404].includes(response.status)) {
      console.error(
        `Failed to fetch What's on? API data: status code ${response.status}`,
      );
      process.exit(1);
    }
    return response;
  } catch (error) {
    logErrors(error, tmdbId, "getWhatsonResponse");
  }
};

module.exports = { getWhatsonResponse };
