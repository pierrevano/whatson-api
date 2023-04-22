/* It's importing the function `removeExtraChar` from the file `removeExtraChar.js` */
const { removeExtraChar } = require("./removeExtraChar");

/**
 * Extracts the content URL from the given HTML using jQuery.
 * @param {CheerioStatic} $ - The Cheerio object representing the HTML.
 * @param {boolean} backup - Whether to use the first or last script tag with type "application/ld+json".
 * @param {string} allocineHomepage - The URL of the Allocine homepage.
 * @returns The content URL parsed from the JSON object.
 */
function getContentUrl($, backup, allocineHomepage) {
  try {
    const JSONValue = backup ? $('script[type="application/ld+json"]') : $('script[type="application/ld+json"]').last();
    const contentParsed = JSON.parse(removeExtraChar(JSONValue.text()));

    return contentParsed;
  } catch (error) {
    console.log(`getContentUrl - ${allocineHomepage}: ${error}`);

    return null;
  }
}

module.exports = { getContentUrl };
