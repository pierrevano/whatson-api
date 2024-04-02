const { logErrors } = require("./logErrors");
const { removeExtraChar } = require("./removeExtraChar");

/**
 * Extracts the content URL from the given HTML using jQuery.
 * @param {CheerioStatic} $ - The Cheerio object representing the HTML.
 * @param {boolean} backup - Whether to use the first or last script tag with type "application/ld+json".
 * @param {string} allocineHomepage - The URL of the AlloCiné homepage.
 * @returns The content URL parsed from the JSON object.
 */
function getContentUrl($, backup, allocineHomepage) {
  try {
    const JSONValue = backup ? $('script[type="application/ld+json"]') : $('script[type="application/ld+json"]').last();
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
