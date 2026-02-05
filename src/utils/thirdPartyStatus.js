const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { logErrors } = require("./logErrors");

/**
 * Checks the availability of a third-party service with automatic retries and user-agent spoofing.
 *
 * @param {string} service - Absolute URL of the status endpoint to probe.
 * @returns {Promise<{success: boolean, data: any}>} Resolves with the HTTP payload when reachable, otherwise flags failure.
 */
const isThirdPartyServiceOK = async (service) => {
  try {
    axiosRetry(axios, {
      retries: config.retries,
      retryDelay: () => config.retryDelay,
    });

    const isImdb = service.includes("imdb.com");
    const options = {
      timeout: config.thirdPartyStatusTimeoutMs,
      validateStatus: (status) => status === 200 || (isImdb && status === 202),
    };

    console.log(`Calling service: ${service}`);
    const response = await axios.get(service, options);

    return {
      success: response.status === 200 || (isImdb && response.status === 202),
      data: response.data,
    };
  } catch (error) {
    logErrors(error, service, null);

    return {
      success: false,
      data: null,
    };
  }
};

module.exports = isThirdPartyServiceOK;
