const { config } = require("./config");
const { getCheerioContent } = require("./utils/getCheerioContent");
const { logErrors } = require("./utils/logErrors");

/**
 * Retrieves the Rotten Tomatoes rating for a given movie or tv show.
 * @param {string} rottenTomatoesHomepage - The Rotten Tomatoes homepage URL.
 * @param {string} rottenTomatoesId - The Rotten Tomatoes ID for the movie or tv show.
 * @returns {Promise<Object>} - An object containing the Rotten Tomatoes rating information.
 * @throws {Error} - If there is an error retrieving the Rotten Tomatoes rating.
 */
const getRottenTomatoesRating = async (rottenTomatoesHomepage, rottenTomatoesId) => {
  let rottenTomatoesObj = null;
  let errorCounter = 0;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    if (rottenTomatoesId !== "null") {
      $ = await getCheerioContent(`${rottenTomatoesHomepage}`, options);
      let usersRating = parseInt($("score-board-deprecated").attr("audiencescore"));
      if (isNaN(usersRating)) usersRating = null;

      let criticsRating = parseInt($("score-board-deprecated").attr("tomatometerscore"));
      if (isNaN(criticsRating)) criticsRating = null;

      rottenTomatoesObj = {
        id: rottenTomatoesId,
        url: rottenTomatoesHomepage,
        usersRating: usersRating,
        criticsRating: criticsRating,
      };
    }

    errorCounter = 0;
  } catch (error) {
    logErrors(errorCounter, error, rottenTomatoesHomepage);
  }

  return rottenTomatoesObj;
};

module.exports = { getRottenTomatoesRating };
