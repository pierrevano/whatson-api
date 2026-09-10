require("dotenv").config({ quiet: true });

const axios = require("axios");

axios.defaults.headers.common["User-Agent"] =
  process.env.WHATSON_TEST_USER_AGENT;
