require("dotenv").config();

const axiosRetry = require("axios-retry");
const axios = require("axios");

const { config } = require("./config");
const { logErrors } = require("../src/utils/logErrors");

/**
 * Makes an API call to The Movie Database (TMDB) to retrieve information about a movie or tvshow.
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow.
 * @param {number} tmdbId - The ID of the movie or tvshow on TMDB.
 * @returns An object containing the response data and status code from the API call.
 */
const getTMDBResponse = async (allocineHomepage, tmdbId) => {
  try {
    const type = allocineHomepage.includes(config.baseURLTypeSeries) ? "tv" : "movie";
    const url = `${config.baseURLTMDBAPI}/${type}/${tmdbId}?api_key=${process.env.THEMOVIEDB_API_KEY}`;

    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = { validateStatus: (status) => status < 500 };
    const { data, status } = await axios.get(url, options);

    return { data, status };
  } catch (error) {
    logErrors(error, allocineHomepage, "getTMDBResponse");
  }
};

module.exports = { getTMDBResponse };
