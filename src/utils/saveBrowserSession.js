const { existsSync, writeFileSync } = require("fs");
const { chromium } = require("playwright");

const {
  BROWSER_STATE_PATH,
  buildBrowserUserAgent,
  HEADLESS_LAUNCH_OPTIONS,
  US_CONTEXT_OPTIONS,
} = require("./browserConfig");

/**
 * Opens a browser and saves session state after page metadata loads.
 *
 * @param {string} url - The page URL to open.
 * @param {boolean} [fresh=false] - Whether to start without saved state.
 * @returns {Promise<void>}
 * @throws {Error} If the URL is missing or the session cannot be saved.
 */
const saveBrowserSession = async (url, fresh = false) => {
  if (!url) throw new Error("Please provide the IMDb title URL to open.");

  const browser = await chromium.launch({
    ...HEADLESS_LAUNCH_OPTIONS,
    headless: false,
  });

  try {
    const context = await browser.newContext({
      ...US_CONTEXT_OPTIONS,
      userAgent: buildBrowserUserAgent(browser),
      storageState:
        !fresh && existsSync(BROWSER_STATE_PATH)
          ? BROWSER_STATE_PATH
          : undefined,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log("Complete verification in the browser window if prompted.");
    await page.waitForSelector("script#__NEXT_DATA__", {
      state: "attached",
      timeout: 0,
    });
    await page.waitForLoadState("domcontentloaded");
    JSON.parse(await page.locator("script#__NEXT_DATA__").textContent());
    writeFileSync(
      BROWSER_STATE_PATH,
      JSON.stringify(await context.storageState()),
      { mode: 0o600 },
    );
    console.log(`Verified browser session saved to ${BROWSER_STATE_PATH}.`);
  } finally {
    await browser.close();
  }
};

if (require.main === module) {
  const args = process.argv.slice(2);
  saveBrowserSession(
    args.find((argument) => argument !== "--fresh"),
    args.includes("--fresh"),
  ).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { saveBrowserSession };
