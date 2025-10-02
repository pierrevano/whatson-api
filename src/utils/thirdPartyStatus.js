const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { generateUserAgent } = require("./generateUserAgent");
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

    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
      timeout: 120000,
    };

    console.log(`Calling service: ${service}`);
    const response = await axios.get(service, options);

    return {
      success: response.status === 200,
      data: response.data,
    };
  } catch (error) {
    if (service === "https://trakt.tv" && error.response?.status === 403) {
      console.log("Skipping Trakt service due to 403 Forbidden");
      return {
        success: true,
        data: null,
      };
    }

    logErrors(error, service, null);

    return {
      success: false,
      data: null,
    };
  }
};

module.exports = isThirdPartyServiceOK;
