const {
  getCheerioContentWithBrowser,
} = require("./getCheerioContentWithBrowser");
const { homepageStatusErrorCode } = require("./getHomepageResponse");
const { logErrors } = require("./logErrors");

/**
 * Fetches IMDb page content and parses the NEXT_DATA payload.
 *
 * @param {string} imdbHomepage - The IMDb homepage URL of the item.
 * @returns {Promise<{ $: import("cheerio").CheerioAPI, nextData: object }>}
 * @throws {Error} If page data cannot be retrieved or parsed.
 */
const getImdbData = async (imdbHomepage) => {
  try {
    const $ = await getCheerioContentWithBrowser(imdbHomepage, "getImdbData");

    if (typeof $ !== "function") {
      throw new Error("IMDb page content is unavailable.");
    }

    const jsonText = $("#__NEXT_DATA__").html();

    if (!jsonText) {
      throw new Error("IMDb NEXT_DATA payload is missing.");
    }

    const nextData = JSON.parse(jsonText);

    if (!nextData || typeof nextData !== "object") {
      throw new Error("IMDb NEXT_DATA payload is invalid.");
    }

    return { $, nextData };
  } catch (error) {
    error.code = homepageStatusErrorCode;
    logErrors(error, imdbHomepage, "getImdbData");
    throw error;
  }
};

module.exports = { getImdbData };
