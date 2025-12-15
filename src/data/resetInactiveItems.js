/**
 * In `update_ids` mode, resets fields for items not in the current active ID list (`allTheMovieDbIds`):
 * - Sets `is_active` to false.
 * - Sets `allocine.popularity` and `imdb.popularity` to null if their objects are not null.
 * Only items matching `item_type` and excluded from the ID list are affected.
 * Logs the number of items excluded from the reset (i.e., still active).
 *
 * @param {Object} params
 * @param {Array<number>} params.allTheMovieDbIds - Active TheMovieDB IDs to keep.
 * @param {import("mongodb").Collection} params.collectionData - Mongo collection containing remote items.
 * @param {Object} params.getNodeVarsValues - Parsed CLI flags.
 * @param {boolean} params.isUpdateIds - Whether `update_ids` mode is active.
 */
const resetInactiveItems = async ({
  allTheMovieDbIds,
  collectionData,
  getNodeVarsValues,
  isUpdateIds,
}) => {
  if (!isUpdateIds) return;

  const filterQuery = {
    item_type: getNodeVarsValues.item_type,
    id: { $nin: allTheMovieDbIds },
  };

  await collectionData.updateMany(filterQuery, {
    $set: { is_active: false },
  });

  await collectionData.updateMany(
    { ...filterQuery, allocine: { $ne: null } },
    { $set: { "allocine.popularity": null } },
  );

  await collectionData.updateMany(
    { ...filterQuery, imdb: { $ne: null } },
    { $set: { "imdb.popularity": null } },
  );

  console.log(
    `${allTheMovieDbIds.length} documents have been excluded from the is_active and popularity reset.`,
  );
};

module.exports = resetInactiveItems;
