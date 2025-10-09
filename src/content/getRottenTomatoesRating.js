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
 *   usersRatingCount: number|null,
 *   usersRatingLikedCount: number|null,
 *   usersRatingNotLikedCount: number|null,
 *   usersCertified: boolean|null,
 *   criticsRatingCount: number|null,
 *   criticsRatingLikedCount: number|null,
 *   criticsRatingNotLikedCount: number|null,
 *   criticsCertified: boolean|null
 * }|null} An object containing the rating information, or null if not available
 */
const getRottenTomatoesRating = async (
  rottenTomatoesHomepage,
  rottenTomatoesId,
) => {
  let rottenTomatoesObj = null;
  let usersRating = null;
  let usersRatingCount = null;
  let usersRatingLikedCount = null;
  let usersRatingNotLikedCount = null;
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
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.rottentomatoes.com/",
        Connection: "keep-alive",
        DNT: "1",
        "Upgrade-Insecure-Requests": "1",
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
          usersRatingLikedCount = parseInt(
            mediaScorecard?.audienceScore?.likedCount,
          );
          if (isNaN(usersRatingLikedCount)) usersRatingLikedCount = null;

          usersRatingNotLikedCount = parseInt(
            mediaScorecard?.audienceScore?.notLikedCount,
          );
          if (isNaN(usersRatingNotLikedCount)) usersRatingNotLikedCount = null;

          if (
            usersRatingLikedCount !== null &&
            usersRatingNotLikedCount !== null
          ) {
            usersRatingCount = usersRatingLikedCount + usersRatingNotLikedCount;
          }

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
          usersRatingCount,
          usersRatingLikedCount,
          usersRatingNotLikedCount,
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
