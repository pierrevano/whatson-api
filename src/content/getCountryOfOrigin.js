/**
 * Extracts the primary country of origin from a raw country data object.
 *
 * @param {object} mainColumnData - Raw data object containing country-related fields.
 * @returns {string|null} The primary country name, or null when unavailable.
 */
const getCountryOfOrigin = (mainColumnData) =>
  mainColumnData?.countriesDetails?.countries?.[0]?.text ?? null;

module.exports = { getCountryOfOrigin };
