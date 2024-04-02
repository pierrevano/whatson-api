const fetch = require("node-fetch");

const { config } = require("./config");
const { logErrors } = require("./utils/logErrors");

/**
 * It fetches the movie IDs from the AlloCiné website, and returns them in an array
 * @param cinemaIdParam - the cinema ID you want to get the movies from
 * @returns An array of movie ids
 */
const getMoviesIds = async (cinemaIdParam) => {
  const base_url = `${config.corsURL}/${config.baseURLTheaters}`;
  const options = {
    headers: {
      "User-Agent": config.userAgent,
    },
  };

  try {
    const response = await fetch(`${base_url}${cinemaIdParam}/p-1/`, options);
    const data = await response.json();
    const page = data.pagination.page;
    const totalPages = data.pagination.totalPages;

    const allMoviesIds = [];
    for (let index = page; index <= totalPages; index++) {
      const complete_url = `${base_url}${cinemaIdParam}/p-${index}/`;
      const response = await fetch(complete_url);
      const data = await response.json();
      const results = data.results;
      results.forEach((element) => {
        allMoviesIds.push(element.movie.internalId);
      });
    }

    return allMoviesIds;
  } catch (error) {
    logErrors(error, cinemaIdParam, "getMoviesIds");
  }
};

module.exports = { getMoviesIds };
