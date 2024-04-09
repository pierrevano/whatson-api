/**
 * It takes a string as an argument and returns an array of objects
 * @param popularity_filters_query - a string of popularity filters separated by commas.
 * @returns An array of objects
 */
const getPopularityFilters = async (popularity_filters_query) => {
  // popularity_filters query info
  const popularity_filters_array = popularity_filters_query.split(",");
  let popularity_filters = [];

  if (popularity_filters_array.includes("none")) return popularity_filters;

  if (popularity_filters_array.includes("all")) {
    // prettier-ignore
    popularity_filters = [
      { $filter: { input: ["$allocine.popularity"], as: "val", cond: { $ne: ["$$val", null] } } },
      { $filter: { input: ["$imdb.popularity"], as: "val", cond: { $ne: ["$$val", null] } } }
    ];

    popularity_filters = popularity_filters.map((filter) => ({
      $divide: [{ $arrayElemAt: [filter, 0] }, 1],
    }));
  } else {
    if (popularity_filters_array.includes("allocine_popularity")) {
      const filter = {
        $filter: {
          input: ["$allocine.popularity"],
          as: "val",
          cond: { $ne: ["$$val", null] },
        },
      };
      popularity_filters.push({ $divide: [{ $arrayElemAt: [filter, 0] }, 1] });
    }

    if (popularity_filters_array.includes("imdb_popularity")) {
      const filter = {
        $filter: {
          input: ["$imdb.popularity"],
          as: "val",
          cond: { $ne: ["$$val", null] },
        },
      };
      popularity_filters.push({ $divide: [{ $arrayElemAt: [filter, 0] }, 1] });
    }
  }

  return popularity_filters;
};

module.exports = { getPopularityFilters };
