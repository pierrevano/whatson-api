const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const cheerio = require("cheerio");

const { config } = require("../config");
const { logErrors } = require("./logErrors");

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
