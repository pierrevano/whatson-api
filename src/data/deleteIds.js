const { b64Encode } = require("../utils/b64EncodeAndDecode");

/**
 * Deletes specified items from the database when `delete_ids` is requested.
 * Expects `--items=<comma-separated list>` in process args. Exits after completion.
 *
 * @param {Object} params
 * @param {import("mongodb").Collection} params.collectionData - Mongo collection containing remote items.
 * @param {Object} params.getNodeVarsValues - Parsed CLI flags.
 * @param {Array<string>} params.processArgs - Typically `process.argv`.
 */
const deleteIds = async ({
  collectionData,
  getNodeVarsValues,
  processArgs,
}) => {
  if (getNodeVarsValues.delete_ids !== "delete_ids") return;

  const itemsArgRaw = processArgs.find((arg) => arg.startsWith("--items="));

  if (!itemsArgRaw) {
    console.log("Please provide --items=<comma-separated list>. Aborting.");
    process.exit(1);
  }

  const itemsToDelete = itemsArgRaw
    .replace("--items=", "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item);

  if (itemsToDelete.length === 0) {
    console.log("No valid items to delete. Aborting.");
    process.exit(1);
  }

  const encodedItems = itemsToDelete.map((item) => b64Encode(item));

  const filterQueryDelete = {
    item_type: getNodeVarsValues.item_type,
    _id: { $in: encodedItems },
  };

  const deleteResult = await collectionData.deleteMany(filterQueryDelete);
  console.log(`${deleteResult.deletedCount} items were deleted.`);

  process.exit(0);
};

module.exports = deleteIds;
