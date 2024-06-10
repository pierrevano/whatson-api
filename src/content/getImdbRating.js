const axiosRetry = require("axios-retry");
const axios = require("axios");

const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes the IMDb homepage of a movie as an argument, and returns the IMDb users rating of the movie
 * @param imdbHomepage - The IMDb homepage of the movie.
 * @returns The critics rating for the movie.
 */
const getImdbRating = async (imdbHomepage) => {
  let criticsRating = null;

  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };
    const $ = await getCheerioContent(imdbHomepage, options, "getImdbRating");

    criticsRating = parseFloat(
      $(".rating-bar__base-button")
        .first()
        .text()
        .split("/")[0]
        .replace("IMDb RATING", ""),
    );
    if (isNaN(criticsRating)) criticsRating = null;
  } catch (error) {
    logErrors(error, imdbHomepage, "getImdbRating");
  }

  return criticsRating;
};

module.exports = { getImdbRating };
