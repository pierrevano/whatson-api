const cheerio = require("cheerio");

const { handleConsentBanner } = require("./handleConsentBanner");
const { logExecutionTime } = require("./logExecutionTime");

const getCheerioContentWithBrowser = async (url, origin) => {
  let browser;
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (_) {
    throw new Error("Playwright is required for browser fallback fetching.");
  }

  try {
    const startTime = Date.now();
    const isLetterboxd = `${origin || ""} ${url || ""}`
      .toLowerCase()
      .includes("letterboxd");
    const waitUntil = isLetterboxd ? "domcontentloaded" : "networkidle";

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(url, { waitUntil, timeout: 30000 });
        break;
      } catch (error) {
        if (error?.name !== "TimeoutError" || attempt === 2) {
          throw error;
        }

        console.log(
          `${origin || "No Origin specified"} - ${url}: Navigation timed out. Retrying...`,
        );
      }
    }

    if (isLetterboxd) {
      await handleConsentBanner(page);
    }

    const $ = cheerio.load(await page.content());
    logExecutionTime(origin, url, 200, startTime);
    return $;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
};

module.exports = { getCheerioContentWithBrowser };
