const fetch = require("node-fetch");

const { config } = require("./config");

/**
 * It fetches the movie IDs from the Allocine website, and returns them in an array
 * @param cinemaIdParam - the cinema ID you want to get the movies from
 * @returns An array of movie ids
 */
const getMoviesIds = async (cinemaIdParam) => {
  const base_url = `${config.corsURL}${config.baseURLTheaters}`;

  const allMoviesIds = [];
  let resultsLength = 0;
  let pageNumber = 1;
  do {
    const complete_url = `${base_url}${cinemaIdParam}/d-0/p-${pageNumber}/`;
    const response = await fetch(complete_url);
    const data = await response.json();

    const results = data.results;
    resultsLength = results.length;
    if (resultsLength === 15) {
      pageNumber++;
    }

    results.forEach((element) => {
      allMoviesIds.push(element.movie.internalId);
    });
  } while (resultsLength === 15);

  return allMoviesIds;
};

module.exports = { getMoviesIds };
