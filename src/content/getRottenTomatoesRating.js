const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getHomepageResponse } = require("../utils/getHomepageResponse");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches embedded rating data, retrying when it is missing.
 *
 * @param {string} url - The provider page URL.
 * @param {import("axios").AxiosRequestConfig} [options] - Request options.
 * @returns {Promise<string>} The raw JSON payload embedded in the page.
 * @throws {Error} If rating data cannot be retrieved.
 */
const fetchMediaScorecardJson = async (url, options) => {
  for (let attempt = 1; attempt <= config.retries; attempt += 1) {
    const $ = await getCheerioContent(url, options, "getRottenTomatoesRating");

    if ($?.error) {
      throw $.error;
    }

    const rawJson = $("#media-scorecard-json").html();

    if (rawJson) {
      return rawJson;
    }

    if (attempt < config.retries) {
      const attemptLog = `getRottenTomatoesRating - ${url}: media-scorecard-json not found (attempt ${attempt}). Retrying...`;
      console.log(attemptLog);
      await delay(config.retryDelay);
    }
  }

  throw new Error("Failed to locate the Rotten Tomatoes JSON.");
};

/**
 * Retrieves audience and critic rating details from a provider page.
 *
 * @param {string} rottenTomatoesHomepage - The provider page URL.
 * @param {string|null} rottenTomatoesId - The provider identifier.
 * @returns {Promise<{
 *   id: string,
 *   url: string,
 *   usersRating: number|null,
 *   criticsRating: number|null,
 *   usersCertified: boolean|null,
 *   criticsRatingCount: number|null,
 *   criticsRatingLikedCount: number|null,
 *   criticsRatingNotLikedCount: number|null,
 *   criticsCertified: boolean|null
 * }|null>} Rating details, or null when no identifier is provided.
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
    if (isNotNull(rottenTomatoesId)) {
      await getHomepageResponse(rottenTomatoesHomepage, {
        serviceName: "Rotten Tomatoes",
        id: rottenTomatoesId,
      });

      const rawJson = await fetchMediaScorecardJson(
        rottenTomatoesHomepage,
        undefined,
      );

      if (!rawJson) {
        throw new Error("Failed to fetch the Rotten Tomatoes JSON.");
      }

      try {
        const mediaScorecard = JSON.parse(rawJson);

        usersRating = parseInt(mediaScorecard?.audienceScore?.scorePercent);
        if (isNaN(usersRating)) usersRating = null;

        if (usersRating) {
          usersCertified =
            typeof mediaScorecard?.audienceScore?.certified === "boolean"
              ? mediaScorecard.audienceScore.certified
              : null;
        }

        criticsRating = parseInt(mediaScorecard?.criticsScore?.scorePercent);
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
