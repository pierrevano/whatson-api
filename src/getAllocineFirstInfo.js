const path = require("path");

const { getCheerioContent } = require("./utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getTrailer } = require("./getTrailer");
const { getStatus } = require("./getStatus");
const { getSeasonsNumber } = require("./getSeasonsNumber");
const { config } = require("./config");

let errorCounter = 0;

/**
 * Retrieves information about a movie or TV show from Allocine.
 * @param {string} allocineHomepage - The URL of the Allocine page for the movie or TV show.
 * @param {string} betaseriesHomepage - The URL of the Betaseries page for the movie or TV show.
 * @param {number} theMoviedbId - The ID of the movie or TV show on The Movie Database.
 * @returns An object containing information about the movie or TV show, including its title, image, user rating, number of seasons, status, and trailer.
 */
const getAllocineFirstInfo = async (allocineHomepage, betaseriesHomepage, theMoviedbId) => {
  try {
    const options = { validateStatus: (status) => status < 500 && status !== 404 };
    const $ = await getCheerioContent(allocineHomepage, options);

    const title = $('meta[property="og:title"]').attr("content");

    let image = $('meta[property="og:image"]').attr("content");
    if (image.includes("empty_portrait")) image = await getImageFromTMDB(allocineHomepage, theMoviedbId);
    if (!image) image = $('meta[property="og:image"]').attr("content");

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

    const seasonsNumber = await getSeasonsNumber(allocineHomepage, theMoviedbId);
    const status = await getStatus($(".thumbnail .label-status").text());
    const trailer = await getTrailer(allocineHomepage, betaseriesHomepage, options);

    let allocineFirstInfo = {
      allocineTitle: title,
      allocineImage: image,
      allocineUsersRating: allocineUsersRating,
      seasonsNumber: seasonsNumber,
      status: status,
      trailer: trailer,
    };

    errorCounter = 0;
    return allocineFirstInfo;
  } catch (error) {
    const fileName = path.basename(__filename);

    console.log(`${fileName} - ${allocineHomepage}: ${error}`);

    errorCounter++;
    if (errorCounter > config.maxErrorCounter.default) {
      console.log(`An error on ${fileName} has been returned more than ${config.maxErrorCounter.default} times, exiting the script.`);
      process.exit(1);
    }

    return {
      error: error,
    };
  }
};

module.exports = { getAllocineFirstInfo };
