function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Constructs a MongoDB aggregation pipeline for retrieving tv show data based on the given parameters.
 * @param {Object} config - The configuration object.
 * @param {Object} is_active_item - The active item object.
 * @param {string} item_type - The type of item to retrieve.
 * @param {Array} pipeline - The current pipeline to add to.
 * @param {string} seasons_number - The number of seasons to retrieve.
 * @param {string} status - The status of the tv show to retrieve.
 * @returns {Array} - The updated pipeline.
 */
const getPipelineFromTVShow = (config, is_active_item, item_type, pipeline, seasons_number, status) => {
  const item_status = { status: { $in: status.split(",").map(capitalize) } };
  const item_type_tvshow = { item_type: "tvshow" };
  const seasons_number_first = {
    seasons_number: { $in: seasons_number.split(",").map(Number) },
  };
  const seasons_number_last = {
    seasons_number: { $gt: config.maxSeasonsNumber },
  };

  if (item_type) {
    const match_item_type_tvshow = {
      $match: { $and: [is_active_item, item_type_tvshow] },
    };
    pipeline.push(match_item_type_tvshow);
  }

  if (seasons_number) {
    if (seasons_number > config.maxSeasonsNumber) {
      const match_item_type_tvshow_and_seasons_number_more_than_max = {
        $match: {
          $and: [is_active_item, item_type_tvshow, { $or: [seasons_number_first, seasons_number_last] }],
        },
      };
      pipeline.push(match_item_type_tvshow_and_seasons_number_more_than_max);
    } else {
      const match_item_type_tvshow_and_seasons_number = {
        $match: {
          $and: [is_active_item, item_type_tvshow, seasons_number_first],
        },
      };
      pipeline.push(match_item_type_tvshow_and_seasons_number);
    }
  }

  if (status) {
    const match_status = {
      $match: { $and: [is_active_item, item_status, item_type_tvshow] },
    };
    pipeline.push(match_status);
  }

  return pipeline;
};

module.exports = { getPipelineFromTVShow };
