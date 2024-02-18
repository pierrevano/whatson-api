const axiosRetry = require("axios-retry");
const axios = require("axios");

const { getCheerioContent } = require("./utils/getCheerioContent");
const { config } = require("./config");

/**
 * It takes the IMDb homepage of a movie as an argument, and returns the IMDb popularity ranking of the movie
 * @param imdbHomepage - The IMDb homepage of the movie.
 * @returns The popularity ranking of the movie.
 */
const getImdbPopularity = async (imdbHomepage) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };
    const $ = await getCheerioContent(`${imdbHomepage}`, options, "getImdbPopularity");

    const popularity =
      $('div[data-testid="hero-rating-bar__popularity__score"]').first().text().trim() !== "" ? parseInt($('div[data-testid="hero-rating-bar__popularity__score"]').first().text().trim()) : null;

    return {
      popularity: popularity,
    };
  } catch (error) {
    console.log(`getImdbPopularity - ${imdbHomepage}: ${error}`);
  }
};

module.exports = { getImdbPopularity };
