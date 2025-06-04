/**
 * Filters episodes_details inside each item for a specific season.
 * If no episodes match, sets episodes_details to null.
 *
 * @param {Array} items - Array of aggregation results with episodes_details.
 * @param {number|null} seasonFilter - The specific season to filter on.
 */
async function filterEpisodesBySeason(items, seasonFilter) {
  const results = items && items[0].results ? items[0].results : items;

  if (!seasonFilter) {
    return items;
  }

  results.forEach((item) => {
    if (Array.isArray(item.episodes_details)) {
      const filteredEpisodes = item.episodes_details.filter(
        (ep) => ep.season === seasonFilter,
      );
      item.episodes_details =
        filteredEpisodes.length > 0 ? filteredEpisodes : null;
    }
  });

  return items;
}

module.exports = { filterEpisodesBySeason };
