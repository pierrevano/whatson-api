/**
 * Returns Mongo sort fields for episode ranking.
 *
 * @param {string} [prefix=""] - Optional field prefix.
 * @param {"asc"|"desc"} [order="desc"] - Rating sort order.
 * @returns {object} Mongo sort fields.
 */
const getEpisodeSortFields = (prefix = "", order = "desc") => {
  const isAscending = order === "asc";

  return {
    [`${prefix}users_rating`]: isAscending ? 1 : -1,
    [`${prefix}users_rating_count`]: -1,
    [`${prefix}release_date`]: isAscending ? 1 : -1,
    [`${prefix}season`]: 1,
    [`${prefix}episode`]: 1,
  };
};

module.exports = { getEpisodeSortFields };
