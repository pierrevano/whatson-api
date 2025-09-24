const { logErrors } = require("./logErrors");
const { removeExtraChar } = require("./removeExtraChar");

/**
 * Extracts structured JSON-LD metadata from the provided HTML snippet.
 * @param {import("cheerio").CheerioAPI} $ - Cheerio handle for the loaded HTML document.
 * @param {boolean} backup - Whether to use the first (true) or last (false) matching script tag.
 * @param {string} allocineHomepage - The AlloCiné homepage URL used for error logging.
 * @returns {Object|null} Parsed JSON data when available, otherwise null.
 */
function getContentUrl($, backup, allocineHomepage) {
  try {
    const JSONValue = backup
      ? $('script[type="application/ld+json"]')
      : $('script[type="application/ld+json"]').last();
    let cleanedJsonString = removeExtraChar(JSONValue.text());

    let contentParsed;
    try {
      contentParsed = JSON.parse(cleanedJsonString);
    } catch (error) {
      return null;
    }

    return contentParsed;
  } catch (error) {
    logErrors(error, allocineHomepage, "getContentUrl");
    return null;
  }
}

module.exports = { getContentUrl };
