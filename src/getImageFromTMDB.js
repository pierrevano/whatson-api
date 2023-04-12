/* Importing the libraries that are needed for the script to work. */
const dotenv = require("dotenv");
dotenv.config();

const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/**
 * It takes the allocineHomepage and theMoviedbId as parameters, and returns the image of the movie or
 * series
 * @param allocineHomepage - the URL of the movie or series on Allocine
 * @param theMoviedbId - the id of the movie or series on TheMovieDB
 * @returns The image is being returned.
 */
const getImageFromTMDB = async (allocineHomepage, theMoviedbId) => {
  try {
    const baseURLTMDB = config.baseURLTMDB;
    const type = allocineHomepage.includes(config.baseURLTypeSeries) ? "tv" : "movie";
    const themoviedb_api_key = process.env.THEMOVIEDB_API_KEY;
    const url = `${baseURLTMDB}/${type}/${theMoviedbId}?api_key=${themoviedb_api_key}`;

    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = { validateStatus: (status) => status === 200 };
    const response = await axios.get(url, options);

    const image_path = response.data.poster_path || response.data.profile_path;

    return image_path;
  } catch (error) {
    console.log(`getImageFromTMDB - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getImageFromTMDB };
