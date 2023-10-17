/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * It takes a URL and an optional options object, makes a request to the URL, and returns a cheerio
 * object
 * @param url - The URL of the page you want to scrape.
 * @param options - This is an object that contains the headers and other options that you want to pass
 * to the request.
 * @returns A function that returns a promise that resolves to a cheerio object.
 */
const getCheerioContent = async (url, options) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const response = await axios.get(url, options);

    if (response.status === 404) {
      throw new Error("Page not found.");
    }

    const $ = cheerio.load(response.data);

    return $;
  } catch (error) {
    return {
      error: error,
    };
  }
};

module.exports = { getCheerioContent };
