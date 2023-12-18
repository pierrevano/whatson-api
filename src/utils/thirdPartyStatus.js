const axios = require("axios");

const isThirdPartyServiceOK = async (service) => {
  try {
    const response = await axios.get(service);
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

module.exports = isThirdPartyServiceOK;
