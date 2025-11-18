const { appendFile } = require("fs");

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches the Rotten Tomatoes media scorecard JSON, and retrying when missing.
 *
 * @param {string} url - The Rotten Tomatoes page URL we need to scrape.
 * @param {object} options - Axios-compatible options used by getCheerioContent.
 * @returns {Promise<string>} The raw JSON payload embedded in the page.
 */
const fetchMediaScorecardJson = async (url, options) => {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    const $ = await getCheerioContent(url, options, "getRottenTomatoesRating");

    if ($?.error) {
      throw $.error;
    }

    const rawJson = $("#media-scorecard-json").html();

    if (rawJson) {
      return rawJson;
    }

    if (attempt < config.maxAttempts) {
      const attemptLog = `getRottenTomatoesRating - ${url}: media-scorecard-json not found (attempt ${attempt}). Retrying...`;
      console.log(attemptLog);
      appendFile(
        "temp_error.log",
        `${new Date().toISOString()} - ${attemptLog}\n`,
        () => {},
      );
      await delay(config.retryDelayMs);
    }
  }

  throw new Error("Failed to locate the Rotten Tomatoes JSON.");
};

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
      const rawJson = await fetchMediaScorecardJson(
        rottenTomatoesHomepage,
        options,
      );

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
