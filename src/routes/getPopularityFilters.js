const { config } = require("../config");

/**
 * Builds popularity aggregation expressions based on the provided query string.
 * @param {string} popularity_filters_query - Comma-separated popularity filters (e.g., "allocine_popularity,imdb_popularity").
 * @returns {Promise<Array<Object>>} Array of MongoDB expressions to apply to the pipeline.
 */
const getPopularityFilters = async (popularity_filters_query) => {
  // popularity_filters query info
  const popularity_filters_array = popularity_filters_query.split(",");
  let popularity_filters = [];

  if (popularity_filters_array.includes("none")) return popularity_filters;

  /**
   * Assign a worst-rank fallback to missing/invalid popularity values to avoid biasing aggregate scores.
   */
  const POPULARITY_MISSING_RANK = 1000000;
  const TMDB_POPULARITY_WEIGHT = config.tmdbPopularityWeight;
  const TRAKT_POPULARITY_WEIGHT = config.traktPopularityWeight;

  /**
   * Convert a raw popularity value into a weighted rank. Only the converted
   * value is weighted.
   */
  const popularityRank = (field, weight) => ({
    $cond: [
      { $and: [{ $ne: [field, null] }, { $gt: [field, 0] }] },
      { $multiply: [{ $divide: [10000, { $add: [field, 1] }] }, weight] },
      POPULARITY_MISSING_RANK,
    ],
  });

  if (popularity_filters_array.includes("all")) {
    // prettier-ignore
    const [allocineFilter, imdbFilter] = [
      { $filter: { input: [{ $ifNull: ["$allocine.popularity", POPULARITY_MISSING_RANK] }], as: "val", cond: { $ne: ["$$val", null] } } },
      { $filter: { input: [{ $ifNull: ["$imdb.popularity", POPULARITY_MISSING_RANK] }], as: "val", cond: { $ne: ["$$val", null] } } },
    ];

    popularity_filters = [
      { $divide: [{ $arrayElemAt: [allocineFilter, 0] }, 1] },
      { $divide: [{ $arrayElemAt: [imdbFilter, 0] }, 1] },
      popularityRank("$tmdb.popularity", TMDB_POPULARITY_WEIGHT),
      popularityRank("$trakt.popularity", TRAKT_POPULARITY_WEIGHT),
    ];
  } else {
    if (popularity_filters_array.includes("allocine_popularity")) {
      const filter = {
        $filter: {
          input: [
            { $ifNull: ["$allocine.popularity", POPULARITY_MISSING_RANK] },
          ],
          as: "val",
          cond: { $ne: ["$$val", null] },
        },
      };
      popularity_filters.push({ $divide: [{ $arrayElemAt: [filter, 0] }, 1] });
    }

    if (popularity_filters_array.includes("imdb_popularity")) {
      const filter = {
        $filter: {
          input: [{ $ifNull: ["$imdb.popularity", POPULARITY_MISSING_RANK] }],
          as: "val",
          cond: { $ne: ["$$val", null] },
        },
      };
      popularity_filters.push({ $divide: [{ $arrayElemAt: [filter, 0] }, 1] });
    }

    if (popularity_filters_array.includes("tmdb_popularity")) {
      popularity_filters.push(
        popularityRank("$tmdb.popularity", TMDB_POPULARITY_WEIGHT),
      );
    }

    if (popularity_filters_array.includes("trakt_popularity")) {
      popularity_filters.push(
        popularityRank("$trakt.popularity", TRAKT_POPULARITY_WEIGHT),
      );
    }
  }

  return popularity_filters;
};

module.exports = { getPopularityFilters };
