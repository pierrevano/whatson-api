const { config } = require("./config");
const { getCheerioContent } = require("./utils/getCheerioContent");
const { isNotNull } = require("./utils/isNotNull");
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

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    if (isNotNull(rottenTomatoesId)) {
      $ = await getCheerioContent(`${rottenTomatoesHomepage}`, options, "getRottenTomatoesRating");

      let usersRating = parseInt($("score-board-deprecated").attr("audiencescore"));
      let criticsRating = parseInt($("score-board-deprecated").attr("tomatometerscore"));

      if (isNaN(usersRating) || isNaN(criticsRating)) {
        const scriptTag = $("#media-scorecard-json");
        const jsonString = scriptTag.html();
        const data = JSON.parse(jsonString);

        if (isNaN(usersRating)) usersRating = data && data.audienceScore && data.audienceScore.score ? parseInt(data.audienceScore.score) : null;
        if (isNaN(criticsRating)) criticsRating = data && data.criticsScore && data.criticsScore.score ? parseInt(data.criticsScore.score) : null;
      }

      if (isNaN(usersRating)) usersRating = null;
      if (isNaN(criticsRating)) criticsRating = null;

      rottenTomatoesObj = {
        id: rottenTomatoesId,
        url: rottenTomatoesHomepage,
        usersRating: usersRating,
        criticsRating: criticsRating,
      };
    }
  } catch (error) {
    logErrors(error, rottenTomatoesHomepage, "getRottenTomatoesRating");
  }

  return rottenTomatoesObj;
};

module.exports = { getRottenTomatoesRating };
