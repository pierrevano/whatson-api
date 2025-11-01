const { config } = require("../config");
const {
  convertFrenchDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getStatus } = require("./getStatus");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes an allocineHomepage as an argument, and returns various metadata about the movie or tvshow.
 * It fetches and parses the AlloCiné page content, optionally enhancing data via TMDB and BetaSeries, unless in compare mode.
 *
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow
 * @param {boolean} compare - Whether to skip heavy metadata parsing (used for performance comparisons)
 * @param {object} [data] - Optional TMDB API response data for the item.
 * @returns {{
 *   allocineTitle: string|null,
 *   image: string|null,
 *   allocineUsersRating: number|null,
 *   allocineUsersRatingCount: number|null,
 *   status: string|null,
 *   releaseDate: string|null
 * }|null|{ error: Error }} AlloCiné metadata when resolved, null when data is
 * unavailable, or an error wrapper when the scrape fails
 */
const getAllocineInfo = async (allocineHomepage, compare, data) => {
  let allocineFirstInfo = null;

  try {
    const options = {
      validateStatus: (status) => status < 500 && status !== 404,
    };
    const $ = await getCheerioContent(
      allocineHomepage,
      options,
      "getAllocineInfo",
    );

    if (typeof $ !== "function") {
      throw new Error(
        `Invalid HTML for the AlloCiné page: ${allocineHomepage}`,
      );
    }

    const title = $('meta[property="og:title"]').attr("content");

    let image = $('meta[property="og:image"]').attr("content");
    if (!image)
      image =
        !compare && data
          ? await getImageFromTMDB(allocineHomepage, data)
          : null;

    let allocineUsersRating = parseFloat(
      $(".stareval-note").eq(1).text().replace(",", "."),
    );
    if (isNaN(allocineUsersRating))
      allocineUsersRating = parseFloat(
        $(".stareval-note").eq(0).text().replace(",", "."),
      );
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

    const extractRating = (index) => {
      const text = $(".stareval-review").eq(index).text();
      const match = text ? text.match(/\d+/) : null;
      return match ? parseInt(match[0], 10) : NaN;
    };

    let allocineUsersRatingCount = extractRating(1);
    if (isNaN(allocineUsersRatingCount)) {
      allocineUsersRatingCount = extractRating(0);
    }
    if (isNaN(allocineUsersRatingCount)) {
      allocineUsersRatingCount = null;
    }

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
      status,
      releaseDate,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getAllocineInfo");

    return {
      error: error,
    };
  }

  return allocineFirstInfo;
};

module.exports = { getAllocineInfo };
