const { appendFile } = require("fs");
const cheerio = require("cheerio");

const { config } = require("../config");
const { generateUserAgent } = require("./generateUserAgent");
const {
  getCheerioContentWithBrowser,
} = require("./getCheerioContentWithBrowser");
const { httpClient } = require("./httpClient");
const { logErrors } = require("./logErrors");
const { logExecutionTime } = require("./logExecutionTime");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildOptions = (options = {}) => ({
  ...options,
  headers: { "User-Agent": generateUserAgent() },
});

/**
 * Fetches HTML content and returns a Cheerio wrapper for subsequent parsing.
 * @param {string} url - The URL of the page you want to scrape.
 * @param {object} [options] - Axios request options, including headers and retry behaviour.
 * @param {string} origin - Identifier of the caller used for logging and retry diagnostics.
 * @returns {Promise<import("cheerio").CheerioAPI | { error: Error }>} The Cheerio instance or an error payload when the request fails.
 */
const getCheerioContent = async (url, options, origin) => {
  const maxAttempts = origin === "getMetacriticRating" ? 2 : config.retries;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const startTime = Date.now();

      const requestOptions = buildOptions(options);
      requestOptions.metadata = {
        origin: origin || "No Origin specified",
      };

      const response = await httpClient.get(url, requestOptions);

      if (response.status !== 200) {
        const statusError = new Error("Failed to retrieve data.");
        statusError.response = response;
        statusError.config = response.config;
        throw statusError;
      }

      const $ = cheerio.load(response.data);
      logExecutionTime(origin, url, response.status, startTime);
      return $;
    } catch (error) {
      const statusCode = error?.response?.status;
      const containsNullValue = url.includes("null");
      const isImdbTitleUrl =
        url.includes("imdb.com") && !url.includes("/episodes");
      let canRetry = attempt < maxAttempts && !containsNullValue;
      const isBlocked = statusCode === 403 || statusCode === 202;

      if (isBlocked) {
        try {
          const $ = await getCheerioContentWithBrowser(url, origin);
          return $;
        } catch (browserError) {
          browserError.cause = error;
          logErrors(browserError, url, `${origin} (browser)`);

          return {
            error: browserError,
          };
        }
      }

      if (canRetry) {
        const attemptLog = `${
          origin || "No Origin specified"
        } - ${url}: Request failed (attempt ${attempt}). Retrying...`;
        console.log(attemptLog);
        appendFile(
          "temp_error.log",
          `${new Date().toISOString()} - ${attemptLog}\n`,
          () => {},
        );
        await delay(config.retryDelay);
      } else {
        logErrors(error, url, origin);

        if (isImdbTitleUrl && attempt >= maxAttempts) {
          console.log(
            `${origin || "No Origin specified"} - ${url}: Max attempts reached. Exiting.`,
          );
          process.exit(1);
        }

        return {
          error: error,
        };
      }
    }
  }
};

module.exports = { getCheerioContent };
