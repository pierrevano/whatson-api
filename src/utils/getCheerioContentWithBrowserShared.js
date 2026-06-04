const { ACCESS_DENIED_STATUS_CODES } = require("./browserConfig");
const { config } = require("../config");
const { homepageStatusErrorCode } = require("./getHomepageResponse");
const { logErrors } = require("./logErrors");

const NAVIGATION_RETRY_COUNT = 5;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastNavigationTime = 0;

/**
 * Enforces a minimum delay between consecutive navigations.
 *
 * @returns {Promise<void>}
 */
const throttleNavigation = async () => {
  const elapsed = Date.now() - lastNavigationTime;
  if (elapsed < config.ratingsDelayMs) {
    await delay(config.ratingsDelayMs - elapsed);
  }
  lastNavigationTime = Date.now();
};

/**
 * Normalizes the browser request settings used by both loading strategies.
 *
 * @param {string} url
 * @param {string} origin
 * @param {{
 *   handleConsent?: boolean,
 *   reuseSharedPage?: boolean,
 * }} [browserOptions]
 * @returns {{
 *   url: string,
 *   origin: string,
 *   handleConsent: boolean,
 *   reuseSharedPage: boolean,
 *   waitUntil: "domcontentloaded"|"networkidle",
 * }}
 */
const createBrowserRequest = (url, origin, browserOptions = {}) => {
  const { handleConsent = false, reuseSharedPage = true } = browserOptions;
  const isLetterboxd = `${origin || ""} ${url || ""}`
    .toLowerCase()
    .includes("letterboxd");

  return {
    url,
    origin,
    handleConsent,
    reuseSharedPage,
    waitUntil: isLetterboxd ? "domcontentloaded" : "networkidle",
  };
};

/**
 * Loads Playwright lazily so browser fallback stays optional.
 *
 * @param {string} url
 * @returns {typeof import("playwright").chromium}
 */
const getPlaywrightChromium = (url) => {
  try {
    return require("playwright").chromium;
  } catch (error) {
    const dependencyError = new Error(
      "Playwright is required for browser fallback fetching.",
    );
    dependencyError.cause = error;
    logErrors(dependencyError, url, "getCheerioContentWithBrowser");
  }
};

/**
 * Logs the failure and stops the run.
 *
 * @param {{ url: string, origin: string }} request
 * @param {number} status
 * @returns {never}
 */
const abortOnAccessDenied = (request, status) => {
  const error = new Error(
    `${request.origin || "No Origin specified"} - ${request.url}: access denied (HTTP ${status}). Aborting the run.`,
  );
  logErrors(
    error,
    request.url,
    request.origin || "getCheerioContentWithBrowser",
  );
};

/**
 * Navigates to a page with a small timeout retry loop used by browser fallbacks.
 *
 * @param {import("playwright").Page} page
 * @param {{
 *   url: string,
 *   origin: string,
 *   waitUntil: "domcontentloaded"|"networkidle",
 * }} request
 * @returns {Promise<void>}
 */
const navigateWithRetries = async (page, request) => {
  let lastDocumentStatus = null;
  const trackDocumentStatus = (response) => {
    if (
      response.request().resourceType() === "document" &&
      response.frame() === page.mainFrame()
    ) {
      lastDocumentStatus = response.status();
    }
  };

  page.on("response", trackDocumentStatus);

  try {
    for (let attempt = 0; attempt < NAVIGATION_RETRY_COUNT; attempt++) {
      let navigationError = null;
      lastDocumentStatus = null;

      await throttleNavigation();

      try {
        await page.goto(request.url, {
          waitUntil: request.waitUntil,
          timeout: 30000,
        });
      } catch (error) {
        navigationError = error;
      }

      const accessDenied = ACCESS_DENIED_STATUS_CODES.has(lastDocumentStatus);
      if (!navigationError && !accessDenied) return;

      if (attempt === NAVIGATION_RETRY_COUNT - 1) {
        if (accessDenied) abortOnAccessDenied(request, lastDocumentStatus);
        navigationError.code = homepageStatusErrorCode;
        throw navigationError;
      }

      const reason = accessDenied
        ? `Access denied (HTTP ${lastDocumentStatus})`
        : `Navigation failed (${navigationError?.name ?? "Error"})`;
      console.log(
        `${request.origin || "No Origin specified"} - ${request.url}: ${reason}. Retrying...`,
      );

      if (accessDenied) await delay(config.retryDelay * 2 ** attempt);
    }
  } finally {
    page.off("response", trackDocumentStatus);
  }
};

module.exports = {
  createBrowserRequest,
  getPlaywrightChromium,
  navigateWithRetries,
};
