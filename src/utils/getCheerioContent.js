/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");
const cheerio = require("cheerio");

const { logErrors } = require("./logErrors");

axiosRetry(axios, {
  retries: 5,
  retryDelay: () => 3000,
  retryCondition: (error) => {
    return error.response && error.response.status >= 500;
  },
  onRetryAttempt: (error) => {
    const cfg = axiosRetry.getConfig(error);
    console.log(`Retrying request [${cfg.currentRetryAttempt}]: ${cfg.url}`);
  },
});

/**
 * It takes a URL and an optional options object, makes a request to the URL, and returns a cheerio object.
 * @param url - The URL of the page you want to scrape.
 * @param options - This is an object that contains the headers and other options, that you want to pass to the request.
 * @returns A function that returns a promise that resolves to a cheerio object or
 * an error object if any error occurs during the process.
 */
const getCheerioContent = async (url, options, origin) => {
  try {
    const startTime = Date.now();

    const response = await axios.get(url, options);

    if (response.status !== 200) {
      throw new Error("Failed to retrieve data.");
    }

    const $ = cheerio.load(response.data);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`${origin} - ${url}:`, response.status, "- Execution time:", executionTime + "ms");

    return $;
  } catch (error) {
    logErrors(error, url, origin);

    return {
      error: error,
    };
  }
};

module.exports = { getCheerioContent };
