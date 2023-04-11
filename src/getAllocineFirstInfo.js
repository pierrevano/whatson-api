/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Used to load environment variables from a .env file into process.env. */
const dotenv = require("dotenv");
dotenv.config();

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/**
 * This module exports four functions: getCheerioContent, getImageFromTMDB, getTrailer, and getStatus.
 * getCheerioContent is used to extract content from a webpage using Cheerio.
 * getImageFromTMDB is used to retrieve an image from The Movie Database API.
 * getTrailer is used to retrieve a trailer for a movie.
 * getStatus is used to retrieve the status of a movie or TV show.
 */
const { getCheerioContent } = require("./utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getTrailer } = require("./getTrailer");
const { getStatus } = require("./getStatus");

/**
 * Retrieves information about a movie or TV show from Allocine.
 * @param {string} allocineHomepage - The URL of the Allocine page for the movie or TV show.
 * @param {string} betaseriesHomepage - The URL of the Betaseries page for the movie or TV show.
 * @param {number} theMoviedbId - The ID of the movie or TV show on The Movie Database.
 * @returns An object containing information about the movie or TV show, including its title, image, user rating, number of seasons (if applicable), status, and trailer.
 */
const getAllocineFirstInfo = async (allocineHomepage, betaseriesHomepage, theMoviedbId) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = { validateStatus: (status) => status === 200 };
    const $ = await getCheerioContent(allocineHomepage, options);

    const title = $('meta[property="og:title"]').attr("content");

    let image = $('meta[property="og:image"]').attr("content");
    if (image.includes("empty_portrait")) image = await getImageFromTMDB(allocineHomepage, theMoviedbId);

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

    let allocineSeasonsNumber = null;
    if (allocineHomepage.includes(config.baseURLTypeSeries)) allocineSeasonsNumber = parseInt($(".stats-number").eq(0).text());
    if (isNaN(allocineSeasonsNumber)) allocineSeasonsNumber = null;

    const trailer = await getTrailer(allocineHomepage, betaseriesHomepage, options);

    const status = await getStatus($(".thumbnail .label-status").text());

    let allocineFirstInfo = {
      allocineTitle: title,
      allocineImage: image,
      allocineUsersRating: allocineUsersRating,
      allocineSeasonsNumber: allocineSeasonsNumber,
      status: status,
      trailer: trailer,
    };

    return allocineFirstInfo;
  } catch (error) {
    console.log(`getAllocineFirstInfo - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getAllocineFirstInfo };
