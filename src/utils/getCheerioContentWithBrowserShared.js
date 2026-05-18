const { homepageStatusErrorCode } = require("./getHomepageResponse");
const { logErrors } = require("./logErrors");

const NAVIGATION_RETRY_COUNT = 3;

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
  for (let attempt = 0; attempt < NAVIGATION_RETRY_COUNT; attempt++) {
    try {
      await page.goto(request.url, {
        waitUntil: request.waitUntil,
        timeout: 60000,
      });
      return;
    } catch (error) {
      if (attempt === NAVIGATION_RETRY_COUNT - 1) {
        error.code = homepageStatusErrorCode;
        throw error;
      }

      console.log(
        `${request.origin || "No Origin specified"} - ${request.url}: Navigation failed (${error?.name ?? "Error"}). Retrying...`,
      );
    }
  }
};

/**
 * Minimizes the current browser window via Chromium CDP when supported.
 *
 * @param {import("playwright").Page} page
 * @returns {Promise<void>}
 */
const minimizePageWindow = async (page) => {
  try {
    const cdpSession = await page.context().newCDPSession(page);
    const { windowId } = await cdpSession.send("Browser.getWindowForTarget");
    await cdpSession.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "minimized" },
    });
  } catch (_) {}
};

module.exports = {
  createBrowserRequest,
  getPlaywrightChromium,
  minimizePageWindow,
  navigateWithRetries,
};
