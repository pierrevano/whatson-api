/**
 * Extracts all countries of origin from a raw country data object.
 *
 * @param {object} mainColumnData - Raw data object containing country-related fields.
 * @returns {string[]|null} Array of country names, or null when unavailable.
 */
const getCountriesOfOrigin = (mainColumnData) => {
  const texts = mainColumnData?.countriesDetails?.countries
    ?.map((c) => c.text)
    ?.filter(Boolean);
  return texts?.length > 0 ? texts : null;
};

module.exports = { getCountriesOfOrigin };
