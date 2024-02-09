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
    console.time("Execution time");

    axiosRetry(axios, {
      retries: 3,
      retryDelay: () => 3000,
      onRetryAttempt: (error) => {
        const cfg = axiosRetry.getConfig(error);
        console.log(`Retrying request [${cfg.currentRetryAttempt}]: ${cfg.url}`);
      },
    });

    const response = await axios.get(url, options);

    if (response.status !== 200) {
      throw new Error("Failed to retrieve data.");
    } else {
      console.log(`${url}:`, response.status);
    }

    const $ = cheerio.load(response.data);

    errorCounter = 0;

    console.timeEnd("Execution time");
    return $;
  } catch (error) {
    logErrors(errorCounter, error, url);

    console.timeEnd("Execution time");
    return {
      error: error,
    };
  }
};

module.exports = { getCheerioContent };
