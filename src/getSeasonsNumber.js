const { getTMDBResponse } = require("./utils/getTMDBResponse");

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/**
 * Retrieves the number of seasons for a given movie or tv show from The Movie Database API.
 * @param {string} allocineHomepage - The Allocine homepage URL for the movie or tv show.
 * @param {number} theMoviedbId - The ID of the movie or tv show on The Movie Database.
 * @returns {Promise<number|null>} - A promise that resolves with the number of seasons, or null if the number cannot be determined.
 */
const getSeasonsNumber = async (allocineHomepage, theMoviedbId) => {
  try {
    let seasonsNumber = null;

    const { data } = await getTMDBResponse(allocineHomepage, theMoviedbId);
    if (data && data.number_of_seasons) {
      seasonsNumber = data.number_of_seasons;
    } else {
      if (allocineHomepage.includes(config.baseURLTypeSeries)) seasonsNumber = parseInt($(".stats-number").eq(0).text());
    }

    if (isNaN(seasonsNumber)) seasonsNumber = null;

    return seasonsNumber;
  } catch (error) {
    console.log(`getSeasonsNumber - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getSeasonsNumber };
