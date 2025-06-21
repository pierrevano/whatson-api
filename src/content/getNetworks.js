const { logErrors } = require("../utils/logErrors");

const networksCount = {};

/**
 * Extracts the names of networks from a TMDB API response.
 * @param {string} allocineHomepage - The homepage of the item on AlloCiné.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string[]|null>} - An array of network names or null if not available.
 */
const getNetworks = async (allocineHomepage, data) => {
  let networkNames = null;

  try {
    const networks =
      data?.networks?.map((network) => {
        const name = network.name;
        networksCount[name] = (networksCount[name] || 0) + 1;
        return name;
      }) || [];

    networkNames = networks.length > 0 ? networks : null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getNetworks");
  }

  return networkNames;
};

module.exports = { getNetworks };
