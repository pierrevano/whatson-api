const cheerio = require("cheerio");

const {
  createBrowserRequest,
  getPlaywrightChromium,
  navigateWithRetries,
} = require("./getCheerioContentWithBrowserShared");
const { handleConsentBanner } = require("./handleConsentBanner");
const {
  buildBrowserUserAgent,
  HEADLESS_LAUNCH_OPTIONS,
  US_CONTEXT_OPTIONS,
} = require("./browserConfig");
const { logExecutionTime } = require("./logExecutionTime");

/**
 * Creates a browser context with a desktop user agent matching the browser.
 *
 * @param {import("playwright").Browser} browser
 * @returns {Promise<import("playwright").BrowserContext>}
 */
const createBrowserContext = (browser) =>
  browser.newContext({
    ...US_CONTEXT_OPTIONS,
    userAgent: buildBrowserUserAgent(browser),
  });

let sharedConsentHandled = false;
let sharedNavigationTask = Promise.resolve();
let sharedSessionPromise = null;

/**
 * Reads the final page content into Cheerio, with optional consent handling.
 *
 * @param {import("playwright").Page} page
 * @param {{
 *   handleConsent?: boolean,
 * }} [options]
 * @returns {Promise<import("cheerio").CheerioAPI>}
 */
const readCheerioFromPage = async (page, options = {}) => {
  if (options.handleConsent) {
    await handleConsentBanner(page);
  }

  return cheerio.load(await page.content());
};

/**
 * Creates the long-lived browser session reused by selected requests.
 *
 * @param {typeof import("playwright").chromium} chromium
 * @returns {Promise<{ browser: import("playwright").Browser, context: import("playwright").BrowserContext, page: import("playwright").Page }>}
 */
const createSharedSession = async (chromium) => {
  const browser = await chromium.launch(HEADLESS_LAUNCH_OPTIONS);
  const context = await createBrowserContext(browser);
  const page = await context.newPage();
  sharedConsentHandled = false;
  return { browser, context, page };
};

/**
 * Returns the current shared session, recreating it if the browser was closed.
 *
 * @param {typeof import("playwright").chromium} chromium
 * @returns {Promise<{ browser: import("playwright").Browser, context: import("playwright").BrowserContext, page: import("playwright").Page }>}
 */
const getSharedSession = async (chromium) => {
  if (!sharedSessionPromise) {
    sharedSessionPromise = createSharedSession(chromium).catch((error) => {
      sharedSessionPromise = null;
      throw error;
    });
  }

  const session = await sharedSessionPromise;

  if (!session.browser.isConnected() || session.page.isClosed()) {
    try {
      await session.context.close();
    } catch (_) {}

    sharedSessionPromise = null;
    return getSharedSession(chromium);
  }

  return session;
};

/**
 * Serializes access to the shared page so concurrent requests do not collide.
 *
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
const runSharedNavigationTask = async (task) => {
  const previousTask = sharedNavigationTask;
  let releaseTask;
  sharedNavigationTask = new Promise((resolve) => {
    releaseTask = resolve;
  });

  await previousTask;

  try {
    return await task();
  } finally {
    releaseTask();
  }
};

/**
 * Closes the long-lived shared browser session so short-lived scripts can exit.
 *
 * @returns {Promise<void>}
 */
const closeSharedBrowserSession = async () => {
  await sharedNavigationTask;

  if (!sharedSessionPromise) return;

  const sessionPromise = sharedSessionPromise;
  sharedSessionPromise = null;

  try {
    const session = await sessionPromise;
    await session.context.close();

    if (session.browser.isConnected()) {
      await session.browser.close();
    }
  } catch (_) {}
};

/**
 * Loads a page in a dedicated temporary browser instance and returns its Cheerio wrapper.
 *
 * @param {typeof import("playwright").chromium} chromium
 * @param {{
 *   url: string,
 *   origin: string,
 *   handleConsent: boolean,
 *   waitUntil: "domcontentloaded"|"networkidle",
 * }} request
 * @returns {Promise<import("cheerio").CheerioAPI>}
 */
const loadCheerioWithDedicatedBrowser = async (chromium, request) => {
  let browser;

  try {
    const startTime = Date.now();
    browser = await chromium.launch(HEADLESS_LAUNCH_OPTIONS);
    const context = await createBrowserContext(browser);
    const page = await context.newPage();

    await navigateWithRetries(page, request);

    const $ = await readCheerioFromPage(page, {
      handleConsent: request.handleConsent,
    });
    logExecutionTime(request.origin, request.url, 200, startTime);
    return $;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
};

/**
 * Loads a page using the shared browser page and returns its Cheerio wrapper.
 *
 * @param {typeof import("playwright").chromium} chromium
 * @param {{
 *   url: string,
 *   origin: string,
 *   handleConsent: boolean,
 *   waitUntil: "domcontentloaded"|"networkidle",
 * }} request
 * @returns {Promise<import("cheerio").CheerioAPI>}
 */
const loadCheerioWithSharedPage = async (chromium, request) =>
  runSharedNavigationTask(async () => {
    const startTime = Date.now();
    const { page } = await getSharedSession(chromium);

    await navigateWithRetries(page, request);

    // Handle consent only once per shared session.
    const handleConsent = request.handleConsent && !sharedConsentHandled;
    if (handleConsent) sharedConsentHandled = true;

    const $ = await readCheerioFromPage(page, { handleConsent });
    logExecutionTime(request.origin, request.url, 200, startTime);
    return $;
  });

/**
 * Fetches HTML content through Playwright and returns a Cheerio wrapper.
 *
 * @param {string} url
 * @param {string} origin
 * @param {{
 *   handleConsent?: boolean,
 *   reuseSharedPage?: boolean,
 * }} [browserOptions]
 * @returns {Promise<import("cheerio").CheerioAPI>}
 */
const getCheerioContentWithBrowser = async (
  url,
  origin,
  browserOptions = {},
) => {
  const chromium = getPlaywrightChromium(url);
  const request = createBrowserRequest(url, origin, browserOptions);

  if (request.reuseSharedPage) {
    return loadCheerioWithSharedPage(chromium, request);
  }

  return loadCheerioWithDedicatedBrowser(chromium, request);
};

module.exports = {
  closeSharedBrowserSession,
  getCheerioContentWithBrowser,
};
