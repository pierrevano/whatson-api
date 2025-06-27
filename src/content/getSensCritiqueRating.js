const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes a sensCritiqueHomepage and sensCritiqueId as arguments, and returns the usersRating and usersRatingCount of the item.
 * It only attempts to fetch and parse the content if a valid sensCritiqueId is provided.
 * The data is extracted from the embedded JSON-LD structure within the SensCritique page.
 *
 * @param {string} sensCritiqueHomepage - The URL of the item's page on senscritique.com
 * @param {string} sensCritiqueId - The SensCritique ID for the movie or TV show
 * @returns {{ id: string, url: string, usersRating: number|null, usersRatingCount: number|null }|null} An object containing the SensCritique rating information, or null if not available
 */
const getSensCritiqueRating = async (sensCritiqueHomepage, sensCritiqueId) => {
  let sensCritiqueObj = null;
  let usersRating = null;
  let usersRatingCount = null;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };

    if (isNotNull(sensCritiqueId)) {
      const $ = await getCheerioContent(
        sensCritiqueHomepage,
        options,
        "getSensCritiqueRating",
      );
      const ldJsonTag = $('script[type="application/ld+json"]').html();

      if (!ldJsonTag) {
        throw new Error("Failed to fetch the SensCritique JSON data.");
      }

      try {
        const cleanJsonText = ldJsonTag.replace(/\/\*.*?\*\//gs, "").trim();
        const movieMetadata = JSON.parse(cleanJsonText);

        usersRating = parseFloat(movieMetadata?.aggregateRating?.ratingValue);
        if (isNaN(usersRating)) usersRating = null;

        if (usersRating) {
          usersRatingCount = parseInt(
            movieMetadata?.aggregateRating?.ratingCount,
            10,
          );
          if (isNaN(usersRatingCount)) usersRatingCount = null;
        }
      } catch (parseErr) {
        throw new Error(
          `Invalid or malformed JSON-LD in SensCritique page: ${parseErr}`,
        );
      }

      sensCritiqueObj = {
        id: sensCritiqueId,
        url: sensCritiqueHomepage,
        usersRating,
        usersRatingCount,
      };
    }
  } catch (error) {
    logErrors(error, sensCritiqueHomepage, "getSensCritiqueRating");
  }

  return sensCritiqueObj;
};

module.exports = { getSensCritiqueRating };
