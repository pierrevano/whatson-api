const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const cheerio = require("cheerio");

const { config } = require("../config");
const { logErrors } = require("./logErrors");

/**
 * Fetches HTML content and returns a Cheerio wrapper for subsequent parsing.
 * @param {string} url - The URL of the page you want to scrape.
 * @param {object} [options] - Axios request options, including headers and retry behaviour.
 * @param {string} origin - Identifier of the caller used for logging and retry diagnostics.
 * @returns {Promise<import("cheerio").CheerioAPI | { error: Error }>} The Cheerio instance or an error payload when the request fails.
 */
const getCheerioContent = async (url, options, origin) => {
  try {
    const startTime = Date.now();

    axiosRetry(axios, {
      retries: config.retries,
      retryDelay: () => config.retryDelay,
      retryCondition: (error) => {
        const retryInfo = {
          origin: origin || "No Origin specified",
          url: url || "No URL specified",
          userAgent:
            options?.headers?.["User-Agent"] || "No User-Agent specified",
          errorCode: error.response?.status || "Network Error",
          ipAddress: error.response?.headers?.["x-forwarded-for"] || "N/A",
          requestHeaders: options?.headers,
          responseHeaders: error.response?.headers,
        };

        if (retryInfo.errorCode !== 404) {
          console.log(
            `Retrying due to error:\n` +
              `Origin: ${retryInfo.origin}\n` +
              `URL: ${retryInfo.url}\n` +
              `Error Code: ${retryInfo.errorCode}\n` +
              `User-Agent: ${retryInfo.userAgent}\n` +
              `IP Address: ${retryInfo.ipAddress}\n` +
              `Request Headers: ${JSON.stringify(retryInfo.requestHeaders, null, 2)}\n` +
              `Response Headers: ${JSON.stringify(retryInfo.responseHeaders, null, 2)}`,
          );
        }

        // Retry only on network errors or server errors except for 404.
        return (
          !error.response ||
          (error.response.status !== 404 && error.response.status >= 500)
        );
      },
    });

    const response = await axios.get(url, options);

    if (response.status !== 200) {
      throw new Error("Failed to retrieve data.");
    }

    const $ = cheerio.load(response.data);
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    console.log(
      `${origin} - ${url}:`,
      response.status,
      "- Execution time:",
      executionTime + "ms",
    );
    return $;
  } catch (error) {
    logErrors(error, url, origin);
    return {
      error: error,
    };
  }
};

module.exports = { getCheerioContent };
