const { getCheerioContent } = require("../utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getSeasonsNumber } = require("./getSeasonsNumber");
const { getStatus } = require("./getStatus");
const { getTrailer } = require("./getTrailer");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves information about a movie or tvshow from AlloCiné.
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow.
 * @param {string} betaseriesHomepage - The URL of the BetaSeries page for the movie or tvshow.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns An object containing information about the movie or tvshow, including its title, image, user rating, number of seasons, status, and trailer.
 */
const getAllocineFirstInfo = async (allocineHomepage, betaseriesHomepage, tmdbId, compare) => {
  let allocineFirstInfo = null;

  try {
    const options = {
      validateStatus: (status) => status < 500 && status !== 404,
    };
    const $ = await getCheerioContent(allocineHomepage, options, "getAllocineFirstInfo");

    const title = $('meta[property="og:title"]').attr("content");

    let image = $('meta[property="og:image"]').attr("content");
    if (image.includes("empty_portrait")) image = await getImageFromTMDB(allocineHomepage, tmdbId);
    if (!image) image = $('meta[property="og:image"]').attr("content");

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

    const seasonsNumber = !compare ? await getSeasonsNumber(allocineHomepage, tmdbId) : null;
    const status = !compare ? await getStatus(allocineHomepage, $(".thumbnail .label-status").text()) : null;
    const trailer = !compare ? await getTrailer(allocineHomepage, betaseriesHomepage, options) : null;

    allocineFirstInfo = {
      allocineTitle: title,
      allocineImage: image,
      allocineUsersRating: allocineUsersRating,
      seasonsNumber: seasonsNumber,
      status: status,
      trailer: trailer,
    };
  } catch (error) {
    logErrors(error, allocineHomepage, "getAllocineFirstInfo");

    return {
      error: error,
    };
  }

  return allocineFirstInfo;
};

module.exports = { getAllocineFirstInfo };
