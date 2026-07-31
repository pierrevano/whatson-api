/**
 * In `update_ids` mode, resets fields for items not in the current active ID list (`allTheMovieDbIds`):
 * - Sets `is_active` to false.
 * - Sets each platform `popularity` to null.
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

  for (const platform of ["allocine", "imdb", "tmdb", "trakt"]) {
    await collectionData.updateMany(
      { ...filterQuery, [platform]: { $ne: null } },
      { $set: { [`${platform}.popularity`]: null } },
    );
  }

  console.log(
    `${allTheMovieDbIds.length} documents have been excluded from the is_active and popularity reset.`,
  );
};

module.exports = resetInactiveItems;
