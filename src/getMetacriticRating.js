const path = require("path");

const { getCheerioContent } = require("./utils/getCheerioContent");
const { config } = require("./config");

/**
 * Retrieves the Metacritic rating for a given movie or tv show.
 * @param {string} metacriticHomepage - The Metacritic homepage URL.
 * @param {string} metacriticId - The Metacritic ID for the movie or tv show.
 * @returns {Promise<Object>} - An object containing the Metacritic rating information.
 * @throws {Error} - If there is an error retrieving the Metacritic rating.
 */
const getMetacriticRating = async (metacriticHomepage, metacriticId) => {
  let metacriticObj = null;
  let errorCounter = 0;

  try {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    };

    if (metacriticId !== "null") {
      $ = await getCheerioContent(`${metacriticHomepage}`, options);
      let usersRating = parseFloat($(".c-siteReviewScore_user span").first().text());
      if (isNaN(usersRating)) usersRating = null;

      $ = await getCheerioContent(`${metacriticHomepage}/critic-reviews`, options);
      let criticsRating = parseInt($(".c-siteReviewScore span").first().text());
      if (isNaN(criticsRating)) criticsRating = null;

      metacriticObj = {
        id: metacriticId,
        url: metacriticHomepage,
        usersRating: usersRating,
        criticsRating: criticsRating,
      };
    }

    errorCounter = 0;
  } catch (error) {
    const fileName = path.basename(__filename);

    console.log(`errorCounter: ${errorCounter} - ${fileName} - ${metacriticHomepage}: ${error}`);

    errorCounter++;
    if (errorCounter > config.maxErrorCounter.default) {
      console.log(`An error on ${fileName} has been returned more than ${config.maxErrorCounter.default} times, exiting the script.`);
      process.exit(1);
    }
  }

  return metacriticObj;
};

module.exports = { getMetacriticRating };
