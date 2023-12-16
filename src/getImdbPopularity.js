const axiosRetry = require("axios-retry");
const axios = require("axios");

const { getCheerioContent } = require("./utils/getCheerioContent");

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
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
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
