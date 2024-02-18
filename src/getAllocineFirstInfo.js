const { getCheerioContent } = require("./utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getTrailer } = require("./getTrailer");
const { getStatus } = require("./getStatus");
const { getSeasonsNumber } = require("./getSeasonsNumber");
const { logErrors } = require("./utils/logErrors");

/**
 * Retrieves information about a movie or tv show from Allocine.
 * @param {string} allocineHomepage - The URL of the Allocine page for the movie or tv show.
 * @param {string} betaseriesHomepage - The URL of the Betaseries page for the movie or tv show.
 * @param {number} theMoviedbId - The ID of the movie or tv show on The Movie Database.
 * @returns An object containing information about the movie or tv show, including its title, image, user rating, number of seasons, status, and trailer.
 */
const getAllocineFirstInfo = async (allocineHomepage, betaseriesHomepage, theMoviedbId, compare) => {
  let allocineFirstInfo = null;

  try {
    const options = { validateStatus: (status) => status < 500 && status !== 404 };
    const $ = await getCheerioContent(allocineHomepage, options, "getAllocineFirstInfo");

    const title = $('meta[property="og:title"]').attr("content");

    let image = $('meta[property="og:image"]').attr("content");
    if (image.includes("empty_portrait")) image = await getImageFromTMDB(allocineHomepage, theMoviedbId);
    if (!image) image = $('meta[property="og:image"]').attr("content");

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

    const seasonsNumber = !compare ? await getSeasonsNumber(allocineHomepage, theMoviedbId) : null;
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
