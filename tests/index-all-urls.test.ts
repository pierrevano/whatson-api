require("dotenv").config();
const axios = require("axios");
const { chromium } = require("playwright");

const { config } = require("../src/config");
const { generateUserAgent } = require("../src/utils/generateUserAgent");
const { schema } = require("../src/schema");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;

async function checkURL(url) {
  try {
    if (url.includes("https://www.dailymotion.com/embed")) {
      return true;
    }

    if (url.includes("trakt.tv")) {
      return await checkURLWithPlaywright(url);
    }

    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
      validateStatus: (status) => status <= 502,
    };
    const response = await axios.head(url, options);
    if (response.status === 200 || response.status === 502) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Invalid URL: ${url}`, error.message);
    return false;
  }
}

async function checkURLWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: generateUserAgent() });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log(`Valid Trakt URL found: ${url}`);
    return true;
  } catch (error) {
    console.error(`Invalid Trakt URL: ${url}`, error.message);
    return false;
  } finally {
    await browser.close();
  }
}

describe("Schema URLs Validation", () => {
  (isRemoteSource ? test.skip : test)(
    "All URLs in schema should be accessible",
    async () => {
      const itemsResponse = await axios.get(
        `${baseURL}?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}&api_key=${config.internalApiKey}`,
      );

      const urlKeys = [
        "image",
        "trailer",
        "allocine.url",
        "betaseries.url",
        "imdb.url",
        "letterboxd.url",
        "metacritic.url",
        "rotten_tomatoes.url",
        "senscritique.url",
        "tmdb.url",
        "trakt.url",
        "tv_time.url",
        "thetvdb.url",
        "mojo.url",
      ];

      for (const item of itemsResponse.data.results) {
        for (const key of urlKeys) {
          const value = key.split(".").reduce((o, k) => (o || {})[k], item);
          if (value) {
            await checkURL(value).then((isValid) => {
              if (!isValid) console.log(`Invalid URL found: ${value}`);
              expect(isValid).toBeTruthy();
            });
          }
        }
      }
    },
    config.timeout * 1000,
  );
});
