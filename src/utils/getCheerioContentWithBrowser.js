const cheerio = require("cheerio");

const {
  createBrowserRequest,
  getPlaywrightChromium,
  minimizePageWindow,
  navigateWithRetries,
} = require("./getCheerioContentWithBrowserShared");
const { handleConsentBanner } = require("./handleConsentBanner");
const { logExecutionTime } = require("./logExecutionTime");

let sharedSessionPromise = null;
let sharedNavigationTask = Promise.resolve();

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
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await minimizePageWindow(page);
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
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
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
 *   waitUntil: "domcontentloaded"|"networkidle",
 * }} request
 * @returns {Promise<import("cheerio").CheerioAPI>}
 */
const loadCheerioWithSharedPage = async (chromium, request) =>
  runSharedNavigationTask(async () => {
    const startTime = Date.now();
    const { page } = await getSharedSession(chromium);

    await navigateWithRetries(page, request);
    await minimizePageWindow(page);

    const $ = await readCheerioFromPage(page);
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
