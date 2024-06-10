const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { logErrors } = require("./logErrors");

const isThirdPartyServiceOK = async (service) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };
    const response = await axios.get(service, options);
    return response.status === 200;
  } catch (error) {
    logErrors(error, service, null);

    return false;
  }
};

module.exports = isThirdPartyServiceOK;
