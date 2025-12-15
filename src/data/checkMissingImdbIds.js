const { writeFileSync } = require("fs");

/**
 * Detects IMDb ID mismatches between Mojo results and the CSV dataset when enabled via
 * `CHECK_MISSING_IMDB`. Writes the missing IDs to `./temp_missing_imdb_ids.json` and exits
 * early if any mismatches are found.
 *
 * @param {Array} mojoBoxOfficeArray - Box office entries fetched from Mojo.
 * @param {Array} jsonArraySortedHighestToLowest - Dataset parsed from the CSV file.
 */
const checkMissingImdbIds = (
  mojoBoxOfficeArray,
  jsonArraySortedHighestToLowest,
) => {
  const shouldCheckMissingImdb = process.env.CHECK_MISSING_IMDB === "true";

  if (!shouldCheckMissingImdb || mojoBoxOfficeArray.length === 0) return;

  const mojoImdbIds = mojoBoxOfficeArray
    .map((item) => (item.imdbId ? String(item.imdbId).trim() : null))
    .filter(Boolean);

  const jsonImdbIds = jsonArraySortedHighestToLowest
    .map((item) => (item.IMDB_ID ? String(item.IMDB_ID).trim() : null))
    .filter(Boolean);

  const jsonImdbIdSet = new Set(jsonImdbIds);

  const missingInJson = mojoImdbIds.filter((id) => !jsonImdbIdSet.has(id));

  writeFileSync(
    "./temp_missing_imdb_ids.json",
    JSON.stringify(missingInJson, null, 2),
    "utf-8",
  );

  if (missingInJson.length > 0) {
    console.log(
      `Found ${missingInJson.length} IMDb ID(s) present in Mojo but missing in CSV. Aborting.`,
    );
    process.exit(0);
  }
};

module.exports = checkMissingImdbIds;
