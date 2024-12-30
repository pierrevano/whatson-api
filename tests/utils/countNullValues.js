const { config } = require("../../src/config");

/**
 * Counts the null values in the specified keys for movie and TV show items separately.
 * For TV show items, the "letterboxd" key is excluded from the count.
 *
 * @param {Array<Object>} items - An array of items, where each item is an object with various properties
 *                                including a `item_type` key indicating if it's a "movie" or "tvshow".
 * @returns {Object} Returns an object containing the total null counts for movie and TV show items:
 *                   - `totalMovieNullCount`: Total number of null values in specified keys for movie items.
 *                   - `totalTVShowNullCount`: Total number of null values in specified keys for TV show items,
 *                     excluding the "letterboxd" key.
 */
const countNullValues = (items) => {
  const countNullsForItems = (items, shouldExcludeKey) => {
    const keysToConsider = shouldExcludeKey
      ? config.ratingsKeys.filter((key) => key !== "letterboxd")
      : config.ratingsKeys;

    return items.reduce((totalNullCount, item) => {
      const nullCount = keysToConsider.reduce((count, key) => {
        return count + (item[key] === null ? 1 : 0);
      }, 0);
      return totalNullCount + nullCount;
    }, 0);
  };

  const movieItems = items.filter((item) => item.item_type === "movie");
  const tvshowItems = items.filter((item) => item.item_type === "tvshow");

  const totalMovieNullCount = countNullsForItems(movieItems, false);
  const totalTVShowNullCount = countNullsForItems(tvshowItems, true);

  return {
    totalMovieNullCount,
    totalTVShowNullCount,
  };
};

module.exports = { countNullValues };