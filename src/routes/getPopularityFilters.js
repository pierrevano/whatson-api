/**
 * Builds the popularity field paths based on the provided query string.
 * @param {string} popularity_filters_query - Comma-separated popularity filters (e.g., "allocine_popularity,imdb_popularity").
 * @returns {Promise<Array<string>>} Array of MongoDB field paths to apply to the pipeline.
 */
const getPopularityFilters = async (popularity_filters_query) => {
  // popularity_filters query info
  const popularity_filters_array = popularity_filters_query.split(",");

  if (popularity_filters_array.includes("none")) return [];

  const popularity_fields = {
    allocine_popularity: "$allocine.popularity",
    imdb_popularity: "$imdb.popularity",
    tmdb_popularity: "$tmdb.popularity",
    trakt_popularity: "$trakt.popularity",
  };
  const is_all = popularity_filters_array.includes("all");

  return Object.entries(popularity_fields)
    .filter(([filter]) => is_all || popularity_filters_array.includes(filter))
    .map(([, field]) => field);
};

module.exports = { getPopularityFilters };
