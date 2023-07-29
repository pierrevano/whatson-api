const axios = require("axios");
const { config } = require("./config");

/**
 * Extracts the ID of a movie or TV show from a remote popularity file hosted on a server.
 * @param {string} allocineURL - The URL of the movie or TV show on Allocine.
 * @returns {Promise<string | undefined>} - The ID of the movie or TV show, or undefined if it cannot be found.
 */
const extractIdFromRemotePopularityFile = async (allocineURL, item_type) => {
  try {
    const popularityPath = item_type === "movie" ? config.filmsPopularityPath : config.seriesPopularityPath;
    const response = await axios.get(`${config.baseURLSurgeAssets}/${popularityPath}`);
    const lines = response.data.split("\n");

    const lastLineWithAllocineURL = lines
      .slice()
      .reverse()
      .find((line) => line.includes(allocineURL));

    if (lastLineWithAllocineURL) {
      const valueBeforeComma = lastLineWithAllocineURL.match(/^(.+?),/)[1];
      return valueBeforeComma;
    }
  } catch (error) {
    console.log(`extractIdFromRemotePopularityFile - ${allocineURL}: ${error}`);
  }
};

/**
 * Retrieves the popularity of a movie from Allocine's remote popularity file.
 * @param {string} allocineURL - The URL of the movie on Allocine's website.
 * @returns An object containing the popularity of the movie, or null if it could not be retrieved.
 */
const getAllocinePopularity = async (allocineURL, item_type) => {
  try {
    const popularityTemp = await extractIdFromRemotePopularityFile(allocineURL, item_type);
    const popularity = popularityTemp ? parseInt(popularityTemp.trim()) : null;

    return {
      popularity: popularity,
    };
  } catch (error) {
    console.log(`getAllocinePopularity - ${allocineURL}: ${error}`);
  }
};

module.exports = { getAllocinePopularity };
