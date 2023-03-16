/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Importing the function `getCheerioContent` from the file `getCheerioContent.js` in the folder
`utils`. */
const { getCheerioContent } = require("./utils/getCheerioContent");

/**
 * It takes a betaseriesHomepage as an argument, and returns the criticsRating of the show
 * @param betaseriesHomepage - the URL of the show's page on betaseries.com
 * @returns The critics rating of the movie from betaseries.com
 */
const getBetaseriesUsersRating = async (betaseriesHomepage) => {
  try {
    let criticsRating;
    if (!betaseriesHomepage.includes("null")) {
      axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
      const options = { validateStatus: (status) => status === 200 };
      const $ = await getCheerioContent(betaseriesHomepage, options);

      criticsRating = parseFloat($(".js-render-stars")[0].attribs.title.replace(" / 5", "").replace(",", "."));
      if (criticsRating === 0) criticsRating = null;
    } else {
      criticsRating = null;
    }

    return criticsRating;
  } catch (error) {
    console.log(`getBetaseriesUsersRating - ${betaseriesHomepage}: ${error}`);
  }
};

module.exports = { getBetaseriesUsersRating };
