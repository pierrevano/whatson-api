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
      { $divide: ["$tmdb.users_rating", 2] },
      { $divide: ["$trakt.users_rating", 20] },
      { $divide: ["$tv_time.users_rating", 2] }
    ];
  } else {
    const ratingsDivisors = {
      allocine_critics: { path: "$allocine.critics_rating", divisor: 1 },
      allocine_users: { path: "$allocine.users_rating", divisor: 1 },
      betaseries_users: { path: "$betaseries.users_rating", divisor: 1 },
      imdb_users: { path: "$imdb.users_rating", divisor: 2 },
      metacritic_critics: { path: "$metacritic.critics_rating", divisor: 20 },
      metacritic_users: { path: "$metacritic.users_rating", divisor: 2 },
      rottentomatoes_critics: {
        path: "$rotten_tomatoes.critics_rating",
        divisor: 20,
      },
      rottentomatoes_users: {
        path: "$rotten_tomatoes.users_rating",
        divisor: 20,
      },
      letterboxd_users: { path: "$letterboxd.users_rating", divisor: 1 },
      senscritique_users: { path: "$senscritique.users_rating", divisor: 2 },
      tmdb_users: { path: "$tmdb.users_rating", divisor: 2 },
      trakt_users: { path: "$trakt.users_rating", divisor: 20 },
      tvtime_users: { path: "$tv_time.users_rating", divisor: 2 },
    };

    ratings_filters_array.forEach((filter) => {
      if (ratingsDivisors[filter]) {
        ratings_filters.push({
          $divide: [
            ratingsDivisors[filter].path,
            ratingsDivisors[filter].divisor,
          ],
        });
      }
    });
  }

  return ratings_filters;
};

module.exports = { getRatingsFilters };
