const cheerio = require("cheerio");

const { generateUserAgent } = require("./generateUserAgent");
const { httpClient } = require("./httpClient");
const { logErrors } = require("./logErrors");

const buildHeaders = (headers = {}) => {
  const defaultHeaders = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,fr-FR;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    DNT: "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  const mergedHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  mergedHeaders["User-Agent"] = headers["User-Agent"] || generateUserAgent();

  return mergedHeaders;
};

const buildOptions = (options = {}) => ({
  ...options,
  headers: buildHeaders(options.headers),
});

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

    const requestOptions = buildOptions(options);
    requestOptions.metadata = {
      origin: origin || "No Origin specified",
    };

    const response = await httpClient.get(url, requestOptions);

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
