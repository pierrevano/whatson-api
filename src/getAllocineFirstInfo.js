/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/* Importing the functions from the files getCheerioContent.js, getImageFromTMDB.js and getTrailer.js. */
const { getCheerioContent } = require("./utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getTrailer } = require("./getTrailer");

/**
 * It gets the title, image, users rating, seasons number and trailer of a movie or a series from the
 * Allocine website
 * @param allocineHomepage - the allocine homepage of the movie/series
 * @param betaseriesHomepage - the betaseries homepage of the movie/series
 * @param theMoviedbId - the id of the movie/series on TheMovieDB
 * @returns An object with the following properties:
 * - allocineTitle
 * - allocineImage
 * - allocineUsersRating
 * - allocineSeasonsNumber
 * - trailer
 */
const getAllocineFirstInfo = async (allocineHomepage, betaseriesHomepage, theMoviedbId) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = { validateStatus: (status) => status === 200 };
    const $ = await getCheerioContent(allocineHomepage, options);

    const title = $('meta[property="og:title"]').attr("content");

    let image = await getImageFromTMDB(allocineHomepage, theMoviedbId);
    if (!image) image = $('meta[property="og:image"]').attr("content");

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

    let allocineSeasonsNumber = null;
    if (allocineHomepage.includes(config.baseURLTypeSeries)) allocineSeasonsNumber = parseInt($(".stats-number").eq(0).text());
    if (isNaN(allocineSeasonsNumber)) allocineSeasonsNumber = null;

    const trailer = await getTrailer(allocineHomepage, betaseriesHomepage, options);

    let allocineFirstInfo = {
      allocineTitle: title,
      allocineImage: image,
      allocineUsersRating: allocineUsersRating,
      allocineSeasonsNumber: allocineSeasonsNumber,
      trailer: trailer,
    };

    return allocineFirstInfo;
  } catch (error) {
    console.log(`getAllocineFirstInfo - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getAllocineFirstInfo };
