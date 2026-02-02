const { writeFileSync } = require("fs");

/**
 * Filters the dataset when `check_id` is provided, optionally limiting results to outdated items.
 * Writes the filtered list to `./temp_mojo_box_office.json` and aborts when nothing matches.
 *
 * @param {Object} params
 * @param {import("mongodb").Collection} params.collectionData - Mongo collection containing remote items.
 * @param {Object} params.getNodeVarsValues - Parsed CLI flags.
 * @param {Array} params.jsonArraySortedHighestToLowest - Dataset parsed from the CSV file.
 * @param {Array} params.mojoBoxOfficeArray - Box Office Mojo dataset.
 * @returns {Promise<Array>} Filtered dataset (or the original array when `check_id` is not set).
 */
const filterByCheckId = async ({
  collectionData,
  getNodeVarsValues,
  jsonArraySortedHighestToLowest,
  mojoBoxOfficeArray,
}) => {
  if (!getNodeVarsValues.check_id) return jsonArraySortedHighestToLowest;

  const isCheckAllIds = getNodeVarsValues.check_id === "all_ids";
  const isCheckAllIdsRecent = getNodeVarsValues.check_id === "all_ids_recent";

  const imdbIdsToUpdate = isCheckAllIds
    ? mojoBoxOfficeArray.map((item) => item.imdbId).filter(Boolean)
    : [getNodeVarsValues.check_id];
  let filteredByImdbId = jsonArraySortedHighestToLowest.filter((item) => {
    return imdbIdsToUpdate.includes(item.IMDB_ID);
  });

  const checkDate = parseInt(getNodeVarsValues.check_date, 10);
  const isCheckDateFilterActive =
    isCheckAllIds && !Number.isNaN(checkDate) && checkDate > 0;

  if (isCheckDateFilterActive) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - checkDate);

    const outdatedDocs = await collectionData
      .find(
        {
          item_type: getNodeVarsValues.item_type,
          updated_at: { $lt: cutoffDate.toISOString() },
        },
        { projection: { id: 1 } },
      )
      .toArray();

    const outdatedIds = new Set(outdatedDocs.map((doc) => doc.id));
    filteredByImdbId = jsonArraySortedHighestToLowest.filter((item) =>
      outdatedIds.has(parseInt(item.THEMOVIEDB_ID, 10)),
    );
  }

  if (isCheckAllIdsRecent) {
    const recentWindowMinutes = Number.parseInt(
      process.env.CHECK_ALL_IDS_RECENT_MINUTES,
      10,
    );
    const recentWindowMs =
      (Number.isNaN(recentWindowMinutes) || recentWindowMinutes <= 0
        ? 120
        : recentWindowMinutes) *
      60 *
      1000;
    const cutoffDate = new Date(Date.now() - recentWindowMs);

    const recentDocs = await collectionData
      .find(
        {
          item_type: getNodeVarsValues.item_type,
          updated_at: { $gte: cutoffDate.toISOString() },
        },
        { projection: { id: 1 } },
      )
      .toArray();

    const recentIds = new Set(recentDocs.map((doc) => doc.id));
    filteredByImdbId = jsonArraySortedHighestToLowest.filter((item) =>
      recentIds.has(parseInt(item.THEMOVIEDB_ID, 10)),
    );
  }

  writeFileSync(
    "./temp_mojo_box_office.json",
    JSON.stringify(filteredByImdbId),
    "utf-8",
  );

  if (filteredByImdbId.length === 0) {
    if (isCheckAllIdsRecent) {
      console.log("No recently updated items found. Aborting.");
      process.exit(0);
    }

    if (isCheckDateFilterActive) {
      console.log(
        `No items older than ${checkDate} day${
          checkDate > 1 ? "s" : ""
        } found. Aborting.`,
      );
      process.exit(0);
    }

    console.log(
      `IMDb ID${
        imdbIdsToUpdate.length > 1 ? "s" : ""
      } ${imdbIdsToUpdate.join(", ")} not found in the dataset. Aborting.`,
    );
    process.exit(0);
  }

  return filteredByImdbId;
};

module.exports = filterByCheckId;
