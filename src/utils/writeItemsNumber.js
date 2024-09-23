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

  writeFileSync(filePath, sortedItems);
};

module.exports = { writeItemsNumber };
