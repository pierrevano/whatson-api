/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Importing the function `getCheerioContent` from the file `getCheerioContent.js` in the folder
`utils`. */
const { getCheerioContent } = require("./utils/getCheerioContent");

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
    console.log(`getImdbUsersRating - ${imdbHomepage}: ${error}`);
  }
};

module.exports = { getImdbUsersRating };
