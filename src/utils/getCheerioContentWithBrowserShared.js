const {
  ACCESS_DENIED_STATUS_CODES,
  BROWSER_STATE_PATH,
} = require("./browserConfig");
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
 * @param {number|null} status
 * @param {boolean} [requiresManualSession] - Whether to include session setup instructions.
 * @returns {never}
 */
const abortOnAccessDenied = (
  request,
  status,
  requiresManualSession = false,
) => {
  const error = new Error(
    requiresManualSession
      ? `Browser session setup is required. Run node src/utils/saveBrowserSession.js "${request.url}" to save a browser session, then restart the script.`
      : `${request.origin || "No Origin specified"} - ${request.url}: access denied (HTTP ${status}). Aborting the run.`,
  );
  logErrors(
    error,
    request.url,
    request.origin || "getCheerioContentWithBrowser",
  );
};

/**
 * Navigates with retries and refreshes browser state when required.
 *
 * @param {import("playwright").Page} page
 * @param {{
 *   url: string,
 *   origin: string,
 *   waitUntil: "domcontentloaded"|"networkidle",
 * }} request
 * @returns {Promise<number|null>} The final document response status.
 */
const navigateWithRetries = async (page, request) => {
  let lastDocumentStatus = null;
  let lastResponseAction = null;
  let sessionRefreshed = false;
  const trackDocumentStatus = (response) => {
    if (
      response.request().resourceType() === "document" &&
      response.frame() === page.mainFrame()
    ) {
      lastDocumentStatus = response.status();
      lastResponseAction = response.headers()["x-amzn-waf-action"];
    }
  };

  page.on("response", trackDocumentStatus);

  try {
    for (let attempt = 0; attempt < NAVIGATION_RETRY_COUNT; attempt++) {
      let navigationError = null;
      lastDocumentStatus = null;
      lastResponseAction = null;

      await throttleNavigation();

      try {
        await page.goto(request.url, {
          waitUntil: request.waitUntil,
          timeout: 30000,
        });
      } catch (error) {
        navigationError = error;
      }

      if (
        new URL(request.url).hostname ===
          new URL(config.baseURLIMDB).hostname &&
        (lastResponseAction === "captcha" ||
          (!navigationError && (await page.title()) === "Human Verification"))
      ) {
        if (process.platform !== "darwin" || sessionRefreshed) {
          abortOnAccessDenied(request, lastDocumentStatus, true);
        }

        console.log(
          "Refreshing browser session. Complete verification in Chrome if prompted; the current request will resume automatically.",
        );
        const { saveBrowserSession } = require("./saveBrowserSession");
        try {
          await saveBrowserSession(request.url, true);
          await page.context().setStorageState(BROWSER_STATE_PATH);
        } catch (error) {
          logErrors(error, request.url, request.origin);
        }
        sessionRefreshed = true;
        attempt--;
        continue;
      }

      const accessDenied = ACCESS_DENIED_STATUS_CODES.has(lastDocumentStatus);
      if (!navigationError && !accessDenied) {
        if (lastDocumentStatus >= 400) {
          const error = new Error(
            `${request.origin || "No Origin specified"} - ${request.url}: homepage returned HTTP ${lastDocumentStatus}.`,
          );
          error.code = homepageStatusErrorCode;
          throw error;
        }
        return lastDocumentStatus;
      }

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
