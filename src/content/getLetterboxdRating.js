const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes a letterboxdHomepage as an argument, and returns the usersRating and usersRatingCount of the item.
 * It only attempts to fetch and parse the content if a valid letterboxdId is provided.
 *
 * @param {string} letterboxdHomepage - The URL of the item's page on letterboxd.com
 * @param {string} letterboxdId - Optional item identifier
 * @returns {{ id: string, url: string, usersRating: number|null, usersRatingCount: number|null }|null} An object containing the rating information, or null if not available
 */
const getLetterboxdRating = async (letterboxdHomepage, letterboxdId) => {
  let letterboxdObj = null;
  let usersRating = null;
  let usersRatingCount = null;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };

    if (isNotNull(letterboxdId)) {
      const $ = await getCheerioContent(
        letterboxdHomepage,
        options,
        "getLetterboxdRating",
      );
      const ldJsonTag = $('script[type="application/ld+json"]').html();

      if (!ldJsonTag || !ldJsonTag.includes("CDATA")) {
        throw new Error("Failed to fetch the Letterboxd JSON data.");
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
          `Invalid or malformed JSON-LD in Letterboxd page: ${parseErr}`,
        );
      }

      letterboxdObj = {
        id: letterboxdId,
        url: letterboxdHomepage,
        usersRating,
        usersRatingCount,
      };
    }
  } catch (error) {
    logErrors(error, letterboxdHomepage, "getLetterboxdRating");
  }

  return letterboxdObj;
};

module.exports = { getLetterboxdRating };
