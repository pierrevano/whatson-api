function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Builds a MongoDB aggregation pipeline for retrieving tvshow data based on filters.
 * @param {Object} config - Configuration object.
 * @param {Object} is_active_item - MongoDB condition to match active items.
 * @param {Object} is_adult_item - MongoDB condition to match adult items.
 * @param {Object} is_must_see_item - MongoDB condition to match must see items.
 * @param {Object} is_users_certified_item - MongoDB condition to match user-certified items.
 * @param {Object} is_critics_certified_item - MongoDB condition to match critics-certified items.
 * @param {string} item_type - Type of item to match (e.g., "tvshow").
 * @param {Array<Object>} pipeline - Aggregation pipeline to append conditions to.
 * @param {string} seasons_number - Comma-separated list of season numbers to filter.
 * @param {string} status - Comma-separated list of statuses to filter (e.g., "ongoing,ended").
 * @returns {Array<Object>} - The updated aggregation pipeline.
 */
const getPipelineFromTVShow = (
  config,
  is_active_item,
  is_adult_item,
  is_must_see_item,
  is_users_certified_item,
  is_critics_certified_item,
  item_type,
  pipeline,
  seasons_number,
  status,
) => {
  const item_type_tvshow = { item_type: "tvshow" };
  const seasons_number_first = {
    seasons_number: { $in: seasons_number.split(",").map(Number) },
  };

  if (item_type) {
    pipeline.push({
      $match: {
        $and: [
          is_active_item,
          is_adult_item,
          is_must_see_item,
          is_users_certified_item,
          is_critics_certified_item,
          item_type_tvshow,
        ],
      },
    });
  }

  if (seasons_number) {
    const numbers = seasons_number
      .split(",")
      .map((n) => Number(n.trim()))
      .filter((n) => !Number.isNaN(n));

    const hasManySeasons = numbers.some((n) => n >= config.maxSeasonsNumber);
    if (hasManySeasons) {
      pipeline.push({
        $match: {
          $and: [
            is_active_item,
            is_adult_item,
            is_must_see_item,
            is_users_certified_item,
            is_critics_certified_item,
            item_type_tvshow,
            {
              $or: [
                seasons_number_first,
                { seasons_number: { $gt: config.maxSeasonsNumber } },
              ],
            },
          ],
        },
      });
    } else {
      pipeline.push({
        $match: {
          $and: [
            is_active_item,
            is_adult_item,
            is_must_see_item,
            is_users_certified_item,
            is_critics_certified_item,
            item_type_tvshow,
            seasons_number_first,
          ],
        },
      });
    }
  }

  if (status) {
    pipeline.push({
      $match: {
        $and: [
          is_active_item,
          is_adult_item,
          is_must_see_item,
          is_users_certified_item,
          is_critics_certified_item,
          { status: { $in: status.split(",").map(capitalize) } },
          item_type_tvshow,
        ],
      },
    });
  }

  return pipeline;
};

module.exports = { getPipelineFromTVShow };
