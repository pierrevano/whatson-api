// HTTP statuses returned when access to the resource is denied.
const ACCESS_DENIED_STATUS_CODES = new Set([401, 403, 451]);

/**
 * Launch options used for every browser-based fetch.
 *
 * @type {import("playwright").LaunchOptions}
 */
const HEADLESS_LAUNCH_OPTIONS = {
  headless: true,
  channel: "chromium",
  args: ["--disable-blink-features=AutomationControlled"],
};

/**
 * Context options applied to every browser-based fetch.
 *
 * @type {import("playwright").BrowserContextOptions}
 */
const US_CONTEXT_OPTIONS = {
  locale: "en-US",
  timezoneId: "America/New_York",
  viewport: { width: 1440, height: 900 },
};

/**
 * Builds a desktop user agent string matching the launched browser version.
 *
 * @param {import("playwright").Browser} browser
 * @returns {string}
 */
const buildBrowserUserAgent = (browser) => {
  const majorVersion = parseInt(browser.version().split(".")[0], 10);
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVersion}.0.0.0 Safari/537.36`;
};

module.exports = {
  ACCESS_DENIED_STATUS_CODES,
  buildBrowserUserAgent,
  HEADLESS_LAUNCH_OPTIONS,
  US_CONTEXT_OPTIONS,
};
