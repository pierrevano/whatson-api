const axiosRetry = require("axios-retry");
const axios = require("axios");

const { getCheerioContent } = require("./utils/getCheerioContent");
const { logErrors } = require("./utils/logErrors");

/**
 * It takes the IMDb homepage of a movie as an argument, and returns the IMDb users rating of the movie
 * @param imdbHomepage - The IMDb homepage of the movie.
 * @returns The critics rating for the movie.
 */
const getImdbUsersRating = async (imdbHomepage) => {
  let criticsRating = null;
  let errorCounter = 0;

  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    };
    const $ = await getCheerioContent(imdbHomepage, options);

    criticsRating = parseFloat($(".rating-bar__base-button").first().text().split("/")[0].replace("IMDb RATING", ""));
    if (isNaN(criticsRating)) criticsRating = null;

    errorCounter = 0;
  } catch (error) {
    logErrors(errorCounter, error, imdbHomepage);
  }

  return criticsRating;
};

module.exports = { getImdbUsersRating };
