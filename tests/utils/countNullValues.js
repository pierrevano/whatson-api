const { config } = require("../../src/config");

/**
 * Counts the null values in the specified keys for movie and TV show items separately.
 * For movie items, the "tv_time" key is excluded from the count.
 * For TV show items, the "letterboxd" key is excluded from the count.
 *
 * @param {Array<Object>} items - An array of items, where each item is an object with various properties
 *                                including a `item_type` key indicating if it's a "movie" or "tvshow".
 * @returns {Object} Returns an object containing the total null counts for movie and TV show items:
 *                   - `totalMovieNullCount`: Total number of null values in specified keys for movie items,
 *                     excluding the "tv_time" key.
 *                   - `totalTVShowNullCount`: Total number of null values in specified keys for TV show items,
 *                     excluding the "letterboxd" key.
 */
const countNullValues = (items) => {
  const countNullsForItems = (items, excludedKey) => {
    const keysToConsider = config.ratingsKeys.filter(
      (key) => key !== excludedKey,
    );

    return items.reduce((totalNullCount, item) => {
      const nullCount = keysToConsider.reduce((count, key) => {
        return count + (item[key] === null ? 1 : 0);
      }, 0);
      return totalNullCount + nullCount;
    }, 0);
  };

  const movieItems = items.filter((item) => item.item_type === "movie");
  const tvshowItems = items.filter((item) => item.item_type === "tvshow");

  const totalMovieNullCount = countNullsForItems(movieItems, "tv_time");
  const totalTVShowNullCount = countNullsForItems(tvshowItems, "letterboxd");

  return {
    totalMovieNullCount,
    totalTVShowNullCount,
  };
};

module.exports = { countNullValues };
