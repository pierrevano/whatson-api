const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the localized title from TMDB response payload.
 * For movies: `title`
 * For TV shows: `name`
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<string|null>} Resolved title from TMDB or null.
 */
const getTitle = async (allocineHomepage, data) => {
  let title = null;

  try {
    title = data?.title || data?.name || null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getTitle");
  }

  return title;
};

/**
 * Retrieves title variants from TMDB translations payload.
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<{ fr: string|null }|null>} Title variants.
 */
const getTitleVariants = async (allocineHomepage, data) => {
  let variants = null;

  try {
    const translationsList = data?.translations?.translations || [];
    const frenchTranslation = translationsList.find(
      (item) => item?.iso_639_1 === "fr" && item?.iso_3166_1 === "FR",
    );

    variants = {
      fr: frenchTranslation?.data?.title || null,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getTitleVariants");
  }

  return variants;
};

module.exports = { getTitle, getTitleVariants };
