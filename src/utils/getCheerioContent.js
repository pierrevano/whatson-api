/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");
const cheerio = require("cheerio");

const { logErrors } = require("./logErrors");

/**
 * It takes a URL and an optional options object, makes a request to the URL, and returns a cheerio
 * object
 * @param url - The URL of the page you want to scrape.
 * @param options - This is an object that contains the headers and other options that you want to pass
 * to the request.
 * @returns A function that returns a promise that resolves to a cheerio object.
 */
const getCheerioContent = async (url, options) => {
  let errorCounter = 0;

  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const response = await axios.get(url, options);

    if (response.status !== 200) {
      throw new Error("Failed to retrieve data.");
    } else if (response.status === 500) {
      console.error(`Internal server error for ${url}, abording.`);
      process.exit(1);
    } else {
      console.log(`${url}:`, response.status);
    }

    const $ = cheerio.load(response.data);

    errorCounter = 0;

    return $;
  } catch (error) {
    logErrors(errorCounter, error, url);

    return {
      error: error,
    };
  }
};

module.exports = { getCheerioContent };
