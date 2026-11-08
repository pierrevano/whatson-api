const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * Extracts rating details from previously fetched response data.
 *
 * @param {string} traktHomepage - Provider URL for the item.
 * @param {number|string|null} traktId - Provider identifier or slug.
 * @param {object|null} [data] - Previously fetched provider response data.
 * @returns {Promise<{
 *   id: number|string,
 *   url: string,
 *   usersRating: number|null,
 *   usersRatingCount: number
 * }|null>} Rating details, or null when the identifier or votes are unavailable.
 */
const getTraktRating = async (traktHomepage, traktId, data) => {
  let traktObj = null;

  try {
    if (isNotNull(traktId)) {
      const usersRating = data?.rating ? Math.round(data.rating * 10) : null;
      const usersRatingCount = data?.votes ? parseInt(data.votes) : null;
      if (!usersRatingCount) return null;

      traktObj = {
        id: traktId,
        url: traktHomepage,
        usersRating,
        usersRatingCount,
      };
    }
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktRating");
  }

  return traktObj;
};

module.exports = { getTraktRating };
