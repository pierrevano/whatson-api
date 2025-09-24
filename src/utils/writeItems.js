const { writeFileSync } = require("fs");

const { config } = require("../config");

/**
 * Writes the count of items to a file based on the type determined from the allocineHomepage.
 *
 * @param {string} allocineHomepage - The URL of the movie or tv show’s page on AlloCiné.
 * @param {Object} itemsCount - An object where keys are item names and values are counts.
 * @param {string} source - The source identifier to be included in the filename.
 */
const writeItemsNumber = (allocineHomepage, itemsCount, source) => {
  const type = allocineHomepage.includes(config.baseURLTypeSeries)
    ? "tvshow"
    : "movie";

  const sortedItems = Object.entries(itemsCount)
    .sort((a, b) => b[1] - a[1])
    .map(([itemName, count]) => `${itemName}: ${count}`)
    .join("\n");

  const filePath = `./temp_${source}_${type}.txt`;

  writeFileSync(filePath, sortedItems, "utf-8");
};

/**
 * Writes any data to a file as JSON, based on the type determined from the allocineHomepage.
 *
 * @param {string} allocineHomepage - The URL of the movie or TV show’s page on AlloCiné.
 * @param {string} itemsArray - The serialized payload to be written to the file.
 * @param {string} source - The source identifier to be included in the filename.
 */
const writeItems = (allocineHomepage, itemsArray, source) => {
  const type = allocineHomepage.includes(config.baseURLTypeSeries)
    ? "tvshow"
    : "movie";

  const filePath = `./temp_${source}_${type}.json`;

  writeFileSync(filePath, itemsArray, "utf-8");
};

module.exports = {
  writeItemsNumber,
  writeItems,
};
