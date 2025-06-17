const { config } = require("../config");
const {
  convertFrenchDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getDirectors } = require("./getDirectors");
const { getGenres } = require("./getGenres");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getSeasonsNumber } = require("./getSeasonsNumber");
const { getStatus } = require("./getStatus");
const { getTrailer } = require("./getTrailer");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes an allocineHomepage as an argument, and returns various metadata about the movie or tvshow.
 * It fetches and parses the AlloCiné page content, optionally enhancing data via TMDB and BetaSeries, unless in compare mode.
 *
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow
 * @param {string} betaseriesHomepage - The URL of the BetaSeries page for the movie or tvshow
 * @param {number} tmdbId - TMDB ID for the movie or tvshow
 * @param {boolean} compare - Whether to skip heavy metadata parsing (used for performance comparisons)
 * @returns {{
 *   allocineTitle: string|null,
 *   image: string|null,
 *   allocineUsersRating: number|null,
 *   allocineUsersRatingCount: number|null,
 *   directors: string[]|null,
 *   genres: string[]|null,
 *   seasonsNumber: number|null,
 *   status: string|null,
 *   trailer: string|null,
 *   releaseDate: string|null
 * }|null} An object containing AlloCiné metadata, or null if not available
 */
const getAllocineInfo = async (
  allocineHomepage,
  betaseriesHomepage,
  tmdbId,
  compare,
) => {
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

    const title = $('meta[property="og:title"]').attr("content");

    const directors = !compare
      ? await getDirectors(allocineHomepage, tmdbId)
      : null;
    const genres = !compare ? await getGenres(allocineHomepage, tmdbId) : null;

    let image = $('meta[property="og:image"]').attr("content");
    if (!image)
      image = !compare
        ? await getImageFromTMDB(allocineHomepage, tmdbId)
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

    const seasonsNumber = !compare
      ? await getSeasonsNumber(allocineHomepage, tmdbId)
      : null;
    const status = !compare
      ? await getStatus(allocineHomepage, $(".thumbnail .label-status").text())
      : null;
    const trailer = !compare
      ? await getTrailer(allocineHomepage, betaseriesHomepage, options)
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
      directors,
      genres,
      seasonsNumber,
      status,
      trailer,
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
