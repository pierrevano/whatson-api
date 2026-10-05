const { config } = require("../config");
const {
  convertFrenchDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getComposers } = require("./getComposers");
const { getContentUrl } = require("../utils/getContentUrl");
const { getDirectors } = require("./getDirectors");
const {
  getHomepageResponseWithRateLimitRetry,
} = require("../utils/getHomepageResponseWithRateLimitRetry");
const { getStatus } = require("./getStatus");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes an allocineHomepage as an argument, and returns various metadata about the movie or tvshow.
 * Compare mode skips status parsing and uses the TV show release-year parser.
 *
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow
 * @param {boolean} compare - Whether to use compare mode.
 * @returns {Promise<{
 *   allocineTitle: string|null,
 *   image: string|null,
 *   allocineUsersRating: number|null,
 *   allocineUsersRatingCount: number|null,
 *   composers: string[]|null,
 *   directors: string[]|null,
 *   status: string|null,
 *   releaseDate: string|null
 * }|null>} AlloCiné metadata when available. Scrape failures are passed to logErrors.
 */
const getAllocineInfo = async (allocineHomepage, compare) => {
  let allocineFirstInfo = null;

  try {
    await getHomepageResponseWithRateLimitRetry(allocineHomepage, {
      serviceName: "AlloCiné",
      allowedStatuses: [200, 429],
      rateLimitHitMessage: "AlloCiné rate limit hit.",
      rateLimitStillActiveMessage:
        "AlloCiné rate limit still active after retry.",
    });

    const $ = await getCheerioContent(
      allocineHomepage,
      undefined,
      "getAllocineInfo",
    );

    if (typeof $ !== "function") {
      throw new Error(
        `Invalid HTML for the AlloCiné page: ${allocineHomepage}`,
      );
    }

    const title = $('meta[property="og:title"]').attr("content") || null;

    const image = $('meta[property="og:image"]').attr("content") || null;

    const metadata = getContentUrl($, false, allocineHomepage);
    const aggregateRating = metadata?.aggregateRating;
    const composers = getComposers(metadata);
    const directors = await getDirectors(allocineHomepage, metadata);
    const usersRating = parseFloat(aggregateRating?.ratingValue);
    const allocineUsersRating = isNaN(usersRating) ? null : usersRating;
    const usersRatingCount = parseInt(aggregateRating?.ratingCount, 10);
    const allocineUsersRatingCount = isNaN(usersRatingCount)
      ? null
      : usersRatingCount;

    const status = !compare
      ? await getStatus(allocineHomepage, $(".thumbnail .label-status").text())
      : null;

    const frenchDateStr = $(".meta-body-item.meta-body-info .date").text()
      ? $(".meta-body-item.meta-body-info .date").text()
      : $(".meta-body-item.meta-body-info").text();
    let releaseDate = null;
    releaseDate =
      !compare && allocineHomepage.includes(config.baseURLTypeFilms)
        ? convertFrenchDateToISOString(frenchDateStr)
        : convertFrenchDateToISOString(frenchDateStr, true);

    allocineFirstInfo = {
      allocineTitle: title,
      image,
      allocineUsersRating,
      allocineUsersRatingCount,
      composers,
      directors,
      status,
      releaseDate,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getAllocineInfo");
  }

  return allocineFirstInfo;
};

module.exports = { getAllocineInfo };
