/**
 * Filters episodes_details inside each item for one or more seasons.
 * Accepts a single season number or a comma-separated list (e.g. "1,2,3").
 * If seasonFilter contains no valid season numbers (e.g. "wrong_value"),
 * returns all seasons unchanged.
 * If no episodes match, sets episodes_details to null.
 *
 * @param {Array} items - Array of aggregation results with episodes_details.
 * @param {string|number|null} seasonFilter - A single season number or a comma-separated list.
 * @returns {Promise<Array>} The original items array with episodes_details filtered when applicable.
 */
async function filterEpisodesBySeason(items, seasonFilter) {
  const results = items && items[0]?.results ? items[0].results : items;

  if (!seasonFilter) {
    return items;
  }

  const seasonNumbers = String(seasonFilter)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  // If nothing valid was parsed (wrong_value), return all seasons
  if (seasonNumbers.length === 0) {
    return items;
  }

  results.forEach((item) => {
    if (Array.isArray(item.episodes_details)) {
      const filteredEpisodes = item.episodes_details.filter((ep) =>
        seasonNumbers.includes(ep.season),
      );
      item.episodes_details =
        filteredEpisodes.length > 0 ? filteredEpisodes : null;
    }
  });

  return items;
}

module.exports = { filterEpisodesBySeason };
