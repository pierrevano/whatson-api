const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getDirectors } = require("./getDirectors");
const { getGenres } = require("./getGenres");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getSeasonsNumber } = require("./getSeasonsNumber");
const { getStatus } = require("./getStatus");
const { getTrailer } = require("./getTrailer");
const { logErrors } = require("../utils/logErrors");
const {
  convertFrenchDateToISOString,
} = require("../utils/convertFrenchDateToISOString");

/**
 * Retrieves information about a movie or tvshow from AlloCiné.
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow.
 * @param {string} betaseriesHomepage - The URL of the BetaSeries page for the movie or tvshow.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns An object containing information about the movie or tvshow, including its title, image, user rating, number of seasons, status, and trailer.
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
    if (!image) image = await getImageFromTMDB(allocineHomepage, tmdbId);

    let allocineUsersRating = parseFloat(
      $(".stareval-note").eq(1).text().replace(",", "."),
    );
    if (isNaN(allocineUsersRating))
      allocineUsersRating = parseFloat(
        $(".stareval-note").eq(0).text().replace(",", "."),
      );
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

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
      image: image,
      allocineUsersRating: allocineUsersRating,
      directors: directors,
      genres: genres,
      seasonsNumber: seasonsNumber,
      status: status,
      trailer: trailer,
      releaseDate: releaseDate,
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
