const axios = require("axios");

const { config } = require("./config");
const { logErrors } = require("./utils/logErrors");

/**
 * It fetches the movie IDs from the AlloCiné website, and returns them in an array
 * @param cinemaIdParam - the cinema ID you want to get the movies from
 * @returns An array of movie ids
 */
const getMoviesIds = async (cinemaIdParam) => {
  if (cinemaIdParam && cinemaIdParam !== "undefined") {
    const base_url = `${config.corsURL}/${config.baseURLTheaters}`;
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    try {
      let response = await axios.get(
        `${base_url}${cinemaIdParam}/p-1/`,
        options,
      );
      let data = response.data;
      const page = data.pagination.page;
      const totalPages = data.pagination.totalPages;

      const allMoviesIds = [];
      for (let index = page; index <= totalPages; index++) {
        response = await axios.get(
          `${base_url}${cinemaIdParam}/p-${index}/`,
          options,
        );
        data = response.data;
        const results = data.results;
        results.forEach((element) => {
          allMoviesIds.push(element.movie.internalId);
        });
      }

      return allMoviesIds;
    } catch (error) {
      logErrors(error, cinemaIdParam, "getMoviesIds");
    }
  }
};

module.exports = { getMoviesIds };
