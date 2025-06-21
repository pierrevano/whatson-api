const { logErrors } = require("../utils/logErrors");

const productionCompaniesCount = {};

/**
 * Extracts the names of production companies from a TMDB API response.
 * @param {string} allocineHomepage - The homepage of the item on AlloCiné.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string[]|null>} - An array of production company names or null if not available.
 */
const getProductionCompanies = async (allocineHomepage, data) => {
  let companyNames = null;

  try {
    const companies =
      data?.production_companies?.map((company) => {
        const name = company.name;
        productionCompaniesCount[name] =
          (productionCompaniesCount[name] || 0) + 1;
        return name;
      }) || [];

    companyNames = companies.length > 0 ? companies : null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getProductionCompanies");
  }

  return companyNames;
};

module.exports = { getProductionCompanies };
