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

const buildConfig = (configOverrides) => {
  if (typeof configOverrides !== "undefined") {
    const { headers: customHeaders, ...requestOptions } = configOverrides;

    return {
      ...requestOptions,
      headers: {
        ...(customHeaders || {}),
        "User-Agent": generateUserAgent(),
      },
    };
  }

  return {
    headers: {
      "User-Agent": generateUserAgent(),
    },
  };
};

/**
 * Fetches HTML content and returns a Cheerio wrapper for subsequent parsing.
 * @param {string} url - The URL of the page you want to scrape.
 * @param {object} [options] - Axios request options, including headers and retry behaviour.
 * @param {string} origin - Identifier of the caller used for logging and retry diagnostics.
 * @param {{
 *   handleConsent?: boolean,
 *   reuseSharedPage?: boolean,
 * }} [browserFallbackOptions] - Browser-specific options used only if the HTTP request is blocked.
 * @returns {Promise<import("cheerio").CheerioAPI | { error: Error }>} The Cheerio instance or an error payload when the request fails.
 */
const getCheerioContent = async (
  url,
  options,
  origin,
  browserFallbackOptions,
) => {
  const maxAttempts = origin === "getMetacriticRating" ? 2 : config.retries;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const startTime = Date.now();

      const requestOptions = {
        ...buildConfig(options),
        metadata: {
          origin: origin || "No Origin specified",
        },
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
      let canRetry = attempt < maxAttempts && !containsNullValue;
      const isBlocked = statusCode === 403 || statusCode === 202;

      if (isBlocked) {
        try {
          const $ = await getCheerioContentWithBrowser(
            url,
            origin,
            browserFallbackOptions,
          );
          return $;
        } catch (browserError) {
          browserError.cause = error;
          logErrors(browserError, url, `${origin} (browser)`);
        }
      }

      if (canRetry) {
        const attemptLog = `${
          origin || "No Origin specified"
        } - ${url}: Request failed (attempt ${attempt}). Retrying...`;
        console.log(attemptLog);
        await delay(config.retryDelay);
      } else {
        logErrors(error, url, origin);
      }
    }
  }
};

module.exports = { getCheerioContent };
