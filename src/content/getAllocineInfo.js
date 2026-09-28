const { config } = require("../config");
const {
  convertFrenchDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getContentUrl } = require("../utils/getContentUrl");
const {
  getHomepageResponseWithRateLimitRetry,
} = require("../utils/getHomepageResponseWithRateLimitRetry");
const { getStatus } = require("./getStatus");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes an allocineHomepage as an argument, and returns various metadata about the movie or tvshow.
 * It fetches and parses the AlloCiné page content unless in compare mode.
 *
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow
 * @param {boolean} compare - Whether to skip heavy metadata parsing (used for performance comparisons)
 * @returns {{
 *   allocineTitle: string|null,
 *   image: string|null,
 *   allocineUsersRating: number|null,
 *   allocineUsersRatingCount: number|null,
 *   composers: string[]|null,
 *   status: string|null,
 *   releaseDate: string|null
 * }|null|{ error: Error }} AlloCiné metadata when resolved, null when data is
 * unavailable, or an error wrapper when the scrape fails
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
    const musicBy = metadata?.musicBy;
    const composerNames = (Array.isArray(musicBy) ? musicBy : [musicBy])
      .map((person) => person?.name)
      .filter((name) => typeof name === "string" && name.trim());
    const composers = composerNames.length ? composerNames : null;
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
      status,
      releaseDate,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getAllocineInfo");
  }

  return allocineFirstInfo;
};

module.exports = { getAllocineInfo };
