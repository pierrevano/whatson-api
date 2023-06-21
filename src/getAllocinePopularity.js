/* Importing the libraries that are needed for the script to work. */
const shell = require("shelljs");

/**
 * This function takes an Allocine URL as input, extracts the popularity value from the website,
 * and returns it as an object.
 *
 * @param {string} allocineURL - The URL of the Allocine page to extract the popularity from.
 * @returns {Promise<{popularity: number}>} Returns a promise that resolves to an object containing the popularity value.
 */
const getAllocinePopularity = async (allocineURL) => {
  try {
    const popularityTemp = shell.exec(`grep "${allocineURL}" popularity | cut -d ',' -f1 | tail -1`, { silent: true });
    const popularity = popularityTemp.trim() === "" ? null : parseInt(popularityTemp.trim());

    return {
      popularity: popularity,
    };
  } catch (error) {
    console.log(`getAllocinePopularity - ${allocineURL}: ${error}`);
  }
};

module.exports = { getAllocinePopularity };
