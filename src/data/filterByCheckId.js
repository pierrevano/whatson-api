const { writeFileSync } = require("fs");

const { b64Encode } = require("../utils/b64EncodeAndDecode");
const { config } = require("../config");

/**
 * Filters the dataset when `check_id` is provided, optionally limiting results to outdated items.
 * Writes the filtered list to an item-type-specific temp file and aborts when nothing matches.
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

  const itemIds = mojoBoxOfficeArray.map((item) => item.imdbId).filter(Boolean);
  let filteredItems = jsonArraySortedHighestToLowest.filter((item) =>
    isCheckAllIds
      ? itemIds.includes(item.IMDB_ID)
      : item.URL === getNodeVarsValues.check_id,
  );

  const checkDate = parseInt(getNodeVarsValues.check_date, 10);
  const isCheckDateFilterActive =
    isCheckAllIds && !Number.isNaN(checkDate) && checkDate > 0;
  const shouldIncludeMissingAllocineIds =
    process.env.CHECK_MISSING_ALLOCINE_IDS === "true";

  if (isCheckDateFilterActive) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - checkDate);

    const outdatedDocs = await collectionData
      .find(
        {
          item_type: getNodeVarsValues.item_type,
          updated_at: { $lt: cutoffDate.toISOString() },
        },
        { projection: { _id: 1 } },
      )
      .toArray();

    const existingDocs = await collectionData
      .find(
        { item_type: getNodeVarsValues.item_type },
        { projection: { _id: 1 } },
      )
      .toArray();

    const outdatedAllocineIds = new Set(
      outdatedDocs.map((doc) => doc._id).filter(Boolean),
    );
    const existingAllocineIds = new Set(
      existingDocs.map((doc) => doc._id).filter(Boolean),
    );
    filteredItems = jsonArraySortedHighestToLowest.filter((item) => {
      const allocineDbId = b64Encode(`${config.baseURLAllocine}${item.URL}`);

      return (
        outdatedAllocineIds.has(allocineDbId) ||
        (shouldIncludeMissingAllocineIds &&
          !existingAllocineIds.has(allocineDbId))
      );
    });
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
    filteredItems = jsonArraySortedHighestToLowest.filter((item) =>
      recentIds.has(parseInt(item.THEMOVIEDB_ID, 10)),
    );
  }

  writeFileSync(
    `./temp_mojo_box_office_${getNodeVarsValues.item_type}.json`,
    JSON.stringify(filteredItems),
    "utf-8",
  );

  if (filteredItems.length === 0) {
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
      `AlloCiné URL ${getNodeVarsValues.check_id} not found in the dataset. Aborting.`,
    );
    process.exit(0);
  }

  return filteredItems;
};

module.exports = filterByCheckId;
