/* It's importing the function `removeExtraChar` from the file `removeExtraChar.js` */
const { removeExtraChar } = require("./removeExtraChar");

/**
 * It gets the last script tag with the type of application/ld+json and parses it into a JSON object
 * @param $ - The cheerio object
 * @param backup - If the first script tag doesn't work, we'll try the last one.
 * @returns The content of the last script tag with the type application/ld+json
 */
function getContentUrl($, backup) {
  const JSONValue = backup ? $('script[type="application/ld+json"]') : $('script[type="application/ld+json"]').last();
  const contentParsed = JSON.parse(removeExtraChar(JSONValue.text()));

  return contentParsed;
}

module.exports = { getContentUrl };
