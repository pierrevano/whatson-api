/* Importing the function `getCheerioContent` from the file `getCheerioContent.js` in the folder
`utils`. */
const { getCheerioContent } = require("./utils/getCheerioContent");

/**
 * Retrieves the Rotten Tomatoes rating for a given movie or TV show.
 * @param {string} rottenTomatoesHomepage - The Rotten Tomatoes homepage URL.
 * @param {string} rottenTomatoesId - The Rotten Tomatoes ID for the movie or TV show.
 * @returns {Promise<Object>} - An object containing the Rotten Tomatoes rating information.
 * @throws {Error} - If there is an error retrieving the Rotten Tomatoes rating.
 */
const getRottenTomatoesRating = async (rottenTomatoesHomepage, rottenTomatoesId) => {
  let rottenTomatoesObj = null;
  try {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
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

    return rottenTomatoesObj;
  } catch (error) {
    console.log(`getRottenTomatoesRating - ${rottenTomatoesHomepage}: ${error}`);
    return rottenTomatoesObj;
  }
};

module.exports = { getRottenTomatoesRating };
