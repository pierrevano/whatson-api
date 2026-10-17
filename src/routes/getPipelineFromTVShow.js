function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Builds a MongoDB aggregation pipeline for retrieving tvshow data based on filters.
 * @param {Object} config - Configuration object.
 * @param {string|undefined} item_type - Expected to be `"tvshow"` when the caller targets TV content; treated as optional.
 * @param {Array<Object>} pipeline - Aggregation pipeline to append conditions to.
 * @param {string} seasons_number - Comma-separated season counts to filter; use an empty string to skip.
 * @param {string|undefined} status - Optional comma-separated list of statuses to filter (e.g., "ongoing,ended").
 * @returns {Array<Object>} - The updated aggregation pipeline.
 */
const getPipelineFromTVShow = (
  config,
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
      $match: item_type_tvshow,
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
          $and: [item_type_tvshow, seasons_number_first],
        },
      });
    }
  }

  if (status) {
    pipeline.push({
      $match: {
        $and: [
          {
            status: { $in: status.split(",").map((s) => capitalize(s.trim())) },
          },
          item_type_tvshow,
        ],
      },
    });
  }

  return pipeline;
};

module.exports = { getPipelineFromTVShow };
