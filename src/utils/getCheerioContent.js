/* Importing the libraries that are needed for the script to work. */
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
  const response = await axios.get(url, options);
  const $ = cheerio.load(response.data);

  return $;
};

module.exports = { getCheerioContent };
