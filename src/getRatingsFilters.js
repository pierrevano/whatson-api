/**
 * It takes a string as an argument and returns an array of objects
 * @param ratings_filters_query - a string of ratings filters separated by commas.
 * @returns An array of objects
 */
const getRatingsFilters = async (ratings_filters_query) => {
  // ratings_filters query info
  const ratings_filters_array = ratings_filters_query.split(",");
  let ratings_filters = [];
  if (ratings_filters_array.includes("all")) {
    // prettier-ignore
    ratings_filters = [
      { $divide: ["$allocine.critics_rating", 1] },
      { $divide: ["$allocine.users_rating", 1] },
      { $divide: ["$betaseries.users_rating", 1] },
      { $divide: ["$imdb.users_rating", 2] },
      { $divide: ["$metacritic.critics_rating", 20] },
      { $divide: ["$metacritic.users_rating", 2] },
      { $divide: ["$rotten_tomatoes.critics_rating", 20] },
      { $divide: ["$rotten_tomatoes.users_rating", 20] },
      { $divide: ["$letterboxd.users_rating", 1] },
      { $divide: ["$senscritique.users_rating", 2] },
      { $divide: ["$trakt.users_rating", 20] }
    ];
  } else {
    if (ratings_filters_array.includes("allocine_critics")) {
      ratings_filters.push({ $divide: ["$allocine.critics_rating", 1] });
    }

    if (ratings_filters_array.includes("allocine_users")) {
      ratings_filters.push({ $divide: ["$allocine.users_rating", 1] });
    }

    if (ratings_filters_array.includes("betaseries_users")) {
      ratings_filters.push({ $divide: ["$betaseries.users_rating", 1] });
    }

    if (ratings_filters_array.includes("imdb_users")) {
      ratings_filters.push({ $divide: ["$imdb.users_rating", 2] });
    }

    if (ratings_filters_array.includes("metacritic_critics")) {
      ratings_filters.push({ $divide: ["$metacritic.critics_rating", 20] });
    }

    if (ratings_filters_array.includes("metacritic_users")) {
      ratings_filters.push({ $divide: ["$metacritic.users_rating", 2] });
    }

    if (ratings_filters_array.includes("rottenTomatoes_critics")) {
      ratings_filters.push({ $divide: ["$rotten_tomatoes.critics_rating", 20] });
    }

    if (ratings_filters_array.includes("rottenTomatoes_users")) {
      ratings_filters.push({ $divide: ["$rotten_tomatoes.users_rating", 20] });
    }

    if (ratings_filters_array.includes("letterboxd_users")) {
      ratings_filters.push({ $divide: ["$letterboxd.users_rating", 1] });
    }

    if (ratings_filters_array.includes("senscritique_users")) {
      ratings_filters.push({ $divide: ["$senscritique.users_rating", 2] });
    }

    if (ratings_filters_array.includes("trakt_users")) {
      ratings_filters.push({ $divide: ["$trakt.users_rating", 20] });
    }
  }

  return ratings_filters;
};

module.exports = { getRatingsFilters };
