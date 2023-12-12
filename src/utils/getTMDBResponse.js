/**
 * Loads environment variables from a .env file into process.env.
 * @returns None
 */
require("dotenv").config();

/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("../config");

/**
 * Makes an API call to The Movie Database (TMDB) to retrieve information about a movie or tv show.
 * @param {string} allocineHomepage - The URL of the Allocine page for the movie or tv show.
 * @param {number} theMoviedbId - The ID of the movie or tv show on TMDB.
 * @returns An object containing the response data and status code from the API call.
 */
const getTMDBResponse = async (allocineHomepage, theMoviedbId) => {
  try {
    const baseURLTMDB = config.baseURLTMDB;
    const type = allocineHomepage.includes(config.baseURLTypeSeries) ? "tv" : "movie";
    const themoviedb_api_key = process.env.THEMOVIEDB_API_KEY;
    const url = `${baseURLTMDB}/${type}/${theMoviedbId}?api_key=${themoviedb_api_key}`;

    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = { validateStatus: (status) => status < 500 };
    const { data, status } = await axios.get(url, options);

    return { data, status };
  } catch (error) {
    console.log(`getTMDBResponse - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getTMDBResponse };
