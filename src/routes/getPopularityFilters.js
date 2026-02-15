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

  const buildTmdbPopularityFilter = () => ({
    $filter: {
      input: [
        {
          $cond: [
            {
              $and: [
                { $ne: ["$tmdb.popularity", null] },
                { $gt: ["$tmdb.popularity", 0] },
              ],
            },
            {
              // Convert TMDB's raw popularity (higher is better) into a rank-like
              // value so it can be averaged alongside other popularity ranks.
              $max: [
                1,
                {
                  $divide: [
                    10000,
                    {
                      $add: ["$tmdb.popularity", 1],
                    },
                  ],
                },
              ],
            },
            POPULARITY_MISSING_RANK,
          ],
        },
      ],
      as: "val",
      cond: { $ne: ["$$val", null] },
    },
  });

  if (popularity_filters_array.includes("all")) {
    // prettier-ignore
    popularity_filters = [
      { $filter: { input: [{ $ifNull: ["$allocine.popularity", POPULARITY_MISSING_RANK] }], as: "val", cond: { $ne: ["$$val", null] } } },
      { $filter: { input: [{ $ifNull: ["$imdb.popularity", POPULARITY_MISSING_RANK] }], as: "val", cond: { $ne: ["$$val", null] } } },
      buildTmdbPopularityFilter()
    ];

    popularity_filters = popularity_filters.map((filter) => ({
      $divide: [{ $arrayElemAt: [filter, 0] }, 1],
    }));
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
      popularity_filters.push({
        $divide: [{ $arrayElemAt: [buildTmdbPopularityFilter(), 0] }, 1],
      });
    }
  }

  return popularity_filters;
};

module.exports = { getPopularityFilters };
