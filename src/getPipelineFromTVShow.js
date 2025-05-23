function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Constructs a MongoDB aggregation pipeline for retrieving tvshow data based on the given parameters.
 * @param {Object} config - The configuration object.
 * @param {Object} is_active_item - The active item object.
 * @param {string} item_type - The type of item to retrieve.
 * @param {Array} pipeline - The current pipeline to add to.
 * @param {string} seasons_number - The number of seasons to retrieve.
 * @param {string} status - The status of the tvshow to retrieve.
 * @returns {Array} - The updated pipeline.
 */
const getPipelineFromTVShow = (
  config,
  is_active_item,
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
      $match: { $and: [is_active_item, item_type_tvshow] },
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
            item_type_tvshow,
            {
              $or: [
                seasons_number_first,
                {
                  seasons_number: { $gt: config.maxSeasonsNumber },
                },
              ],
            },
          ],
        },
      });
    } else {
      pipeline.push({
        $match: {
          $and: [is_active_item, item_type_tvshow, seasons_number_first],
        },
      });
    }
  }

  if (status) {
    pipeline.push({
      $match: {
        $and: [
          is_active_item,
          { status: { $in: status.split(",").map(capitalize) } },
          item_type_tvshow,
        ],
      },
    });
  }

  return pipeline;
};

module.exports = { getPipelineFromTVShow };
