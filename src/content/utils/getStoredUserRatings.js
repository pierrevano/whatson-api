const { b64Encode } = require("../../utils/b64EncodeAndDecode");
const { config } = require("../../config");
const { getWhatsonResponse } = require("../../utils/getWhatsonResponse");

/**
 * Retrieves stored user ratings when reuse is enabled.
 *
 * @param {string} allocineHomepage - The item's AlloCiné URL.
 * @param {number} tmdbId - The item's TMDB ID.
 * @param {string} sourceKey - The ratings source key.
 * @param {string|number} sourceId - The item's ID in the ratings source.
 * @returns {Promise<{ usersRating: number|null, usersRatingCount: number|null }|null>} The stored ratings, or null when reuse is disabled.
 * @throws {Error} If the stored item or source cannot be matched.
 */
const getStoredUserRatings = async (
  allocineHomepage,
  tmdbId,
  sourceKey,
  sourceId,
) => {
  if (process.env.REUSE_WHATSON_RATINGS !== "true") return null;

  const itemType = allocineHomepage.includes(config.baseURLTypeSeries)
    ? "tvshow"
    : "movie";
  const { data } = await getWhatsonResponse(itemType, tmdbId);
  const sourceRatings = data?.[sourceKey];
  if (
    data?._id !== b64Encode(allocineHomepage) ||
    sourceRatings?.id == null ||
    sourceRatings.id !== sourceId
  ) {
    throw new Error(`Matching stored ratings were not found for ${sourceKey}.`);
  }

  const usersRating = sourceRatings.users_rating ?? null;
  const usersRatingCount = sourceRatings.users_rating_count ?? null;
  return { usersRating, usersRatingCount };
};

module.exports = { getStoredUserRatings };
