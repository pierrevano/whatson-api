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
    const $ = await getCheerioContent(`${imdbHomepage}reference/`, options);

    const popularity = $('a[href="/chart/toptv"]').text().trim() === "" ? null : parseInt($('a[href="/chart/toptv"]').text().split("#")[1]);

    return {
      popularity: popularity,
    };
  } catch (error) {
    console.log(`getImdbPopularity - ${imdbHomepage}: ${error}`);
  }
};

module.exports = { getImdbPopularity };
