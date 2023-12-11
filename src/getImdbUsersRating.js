const axiosRetry = require("axios-retry");
const axios = require("axios");
const path = require("path");

const { getCheerioContent } = require("./utils/getCheerioContent");
const { config } = require("./config");

let errorCounter = 0;

/**
 * It takes the IMDb homepage of a movie as an argument, and returns the IMDb users rating of the movie
 * @param imdbHomepage - The IMDb homepage of the movie.
 * @returns The critics rating for the movie.
 */
const getImdbUsersRating = async (imdbHomepage) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    };
    const $ = await getCheerioContent(imdbHomepage, options);

    let criticsRating = parseFloat($(".rating-bar__base-button").first().text().split("/")[0].replace("IMDb RATING", ""));
    if (isNaN(criticsRating)) criticsRating = null;

    return criticsRating;
  } catch (error) {
    const fileName = path.basename(__filename);

    console.log(`${fileName} - ${imdbHomepage}: ${error}`);

    errorCounter++;
    if (errorCounter > config.maxErrorCounter.default) {
      console.log(`An error on ${fileName} has been returned more than ${config.maxErrorCounter.default} times, exiting the script.`);
      process.exit(1);
    }
  }
};

module.exports = { getImdbUsersRating };
