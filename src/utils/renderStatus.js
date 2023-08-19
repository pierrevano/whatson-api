const axios = require("axios");

const isRenderStatusOK = async () => {
  try {
    const response = await axios.get("https://status.render.com/");
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

module.exports = isRenderStatusOK;
