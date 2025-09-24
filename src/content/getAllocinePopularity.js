const axios = require("axios");

const { config } = require("../config");
const { logErrors } = require("../utils/logErrors");

/**
 * Extracts the ID of a movie or tvshow from a remote popularity file hosted on a server.
 * @param {string} allocineURL - The URL of the movie or tvshow on AlloCiné.
 * @param {string} item_type - Type of item to inspect ("movie" or "tvshow").
 * @returns {Promise<string | undefined>} The ID of the movie or tvshow, or undefined if it cannot be found.
 */
const extractIdFromRemotePopularityFile = async (allocineURL, item_type) => {
  try {
    const popularityPath =
      item_type === "movie"
        ? config.filmsPopularityPath
        : config.seriesPopularityPath;
    const url = `${config.baseURLAssets}/${popularityPath}`;

    const response = await axios.get(url);
    const lines = response.data.split("\n");

    const firstLineWithAllocineURL = lines.find((line) =>
      line.includes(allocineURL),
    );

    if (firstLineWithAllocineURL) {
      const valueBeforeComma = firstLineWithAllocineURL.match(/^(.+?),/)[1];
      return valueBeforeComma;
    }
  } catch (error) {
    logErrors(error, allocineURL, "extractIdFromRemotePopularityFile");
  }
};

/**
 * Retrieves the popularity rank of a movie or tvshow from AlloCiné's remote popularity file.
 * @param {string} allocineURL - The URL of the movie or tvshow on AlloCiné's website.
 * @param {string} item_type - Type of item to inspect ("movie" or "tvshow").
 * @returns {Promise<{ popularity: number | null } | undefined>} The popularity information, or undefined if the lookup fails.
 */
const getAllocinePopularity = async (allocineURL, item_type) => {
  try {
    const popularityTemp = await extractIdFromRemotePopularityFile(
      allocineURL,
      item_type,
    );
    const popularity = popularityTemp ? parseInt(popularityTemp.trim()) : null;

    return {
      popularity: popularity,
    };
  } catch (error) {
    logErrors(error, allocineURL, "getAllocinePopularity");
  }
};

module.exports = { getAllocinePopularity };
