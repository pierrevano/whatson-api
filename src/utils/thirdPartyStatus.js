const axios = require("axios");
const axiosRetry = require("axios-retry");

const isThirdPartyServiceOK = async (service) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    };
    const response = await axios.get(service, options);
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

module.exports = isThirdPartyServiceOK;
