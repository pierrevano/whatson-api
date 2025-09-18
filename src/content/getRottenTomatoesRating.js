const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes a rottenTomatoesHomepage as an argument, and returns user and critic rating details.
 * It only attempts to fetch and parse the content if a valid rottenTomatoesId is provided.
 *
 * @param {string} rottenTomatoesHomepage - The URL of the item's page on rottentomatoes.com
 * @param {string} rottenTomatoesId - Optional item identifier
 * @returns {{
 *   id: string,
 *   url: string,
 *   usersRating: number|null,
 *   criticsRating: number|null,
 *   criticsRatingCount: number|null,
 *   criticsRatingLikedCount: number|null,
 *   criticsRatingNotLikedCount: number|null
 * }|null} An object containing the rating information, or null if not available
 */
const getRottenTomatoesRating = async (
  rottenTomatoesHomepage,
  rottenTomatoesId,
) => {
  let rottenTomatoesObj = null;
  let usersRating = null;
  let criticsRating = null;
  let criticsRatingCount = null;
  let criticsRatingLikedCount = null;
  let criticsRatingNotLikedCount = null;
  let usersCertified = null;
  let criticsCertified = null;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };

    if (isNotNull(rottenTomatoesId)) {
      const $ = await getCheerioContent(
        rottenTomatoesHomepage,
        options,
        "getRottenTomatoesRating",
      );

      const rawJson = $("#media-scorecard-json").html();

      if (!rawJson) {
        throw new Error("Failed to locate the Rotten Tomatoes JSON.");
      }

      try {
        const mediaScorecard = JSON.parse(rawJson);

        usersRating = parseInt(mediaScorecard?.audienceScore?.score);
        if (isNaN(usersRating)) usersRating = null;

        if (usersRating) {
          usersCertified =
            typeof mediaScorecard?.audienceScore?.certified === "boolean"
              ? mediaScorecard.audienceScore.certified
              : null;
        }

        criticsRating = parseInt(mediaScorecard?.criticsScore?.score);
        if (isNaN(criticsRating)) criticsRating = null;

        if (criticsRating) {
          criticsRatingCount = parseInt(
            mediaScorecard?.criticsScore?.ratingCount,
          );
          if (isNaN(criticsRatingCount)) criticsRatingCount = null;

          if (
            mediaScorecard?.criticsScore?.ratingCount !==
            mediaScorecard?.criticsScore?.reviewCount
          ) {
            console.log(mediaScorecard);
            throw new Error("Different ratingCount and reviewCount.");
          }

          criticsRatingLikedCount = parseInt(
            mediaScorecard?.criticsScore?.likedCount,
          );
          if (isNaN(criticsRatingLikedCount)) criticsRatingLikedCount = null;

          criticsRatingNotLikedCount = parseInt(
            mediaScorecard?.criticsScore?.notLikedCount,
          );
          if (isNaN(criticsRatingNotLikedCount))
            criticsRatingNotLikedCount = null;

          criticsCertified =
            typeof mediaScorecard?.criticsScore?.certified === "boolean"
              ? mediaScorecard.criticsScore.certified
              : null;
        }

        rottenTomatoesObj = {
          id: rottenTomatoesId,
          url: rottenTomatoesHomepage,
          usersRating,
          usersCertified,
          criticsRating,
          criticsRatingCount,
          criticsRatingLikedCount,
          criticsRatingNotLikedCount,
          criticsCertified,
        };
      } catch (parseErr) {
        throw new Error(
          `Invalid or malformed JSON in Rotten Tomatoes page: ${parseErr}`,
        );
      }
    }
  } catch (error) {
    logErrors(error, rottenTomatoesHomepage, "getRottenTomatoesRating");
  }

  return rottenTomatoesObj;
};

module.exports = { getRottenTomatoesRating };
