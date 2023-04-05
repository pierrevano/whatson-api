/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Used to load environment variables from a .env file into process.env. */
const dotenv = require("dotenv");
dotenv.config();

/**
 * Configures the Cloudinary API with the given credentials.
 * @param {string} cloud_name - The name of the Cloudinary account.
 * @param {string} api_key - The API key for the Cloudinary account.
 * @param {string} api_secret - The API secret for the Cloudinary account.
 * @returns None
 */
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: "do3n8oace",
  api_key: "476171173971464",
  api_secret: process.env.CLOUDINARY_API_KEY,
});

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/**
 * This module exports several utility functions for use in other modules.
 * @module utils
 * @property {function} getCheerioContent - A function that extracts content from a Cheerio object.
 * @property {function} getImageFromTMDB - A function that retrieves an image from The Movie Database API.
 * @property {function} getTrailer - A function that retrieves a trailer from YouTube.
 * @property {function} getPlaceholder - A function that retrieves a placeholder image.
 * @property {function} b64Encode - A function that encodes a string to base64.
 */
const { getCheerioContent } = require("./utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getTrailer } = require("./getTrailer");
const { getPlaceholder } = require("./getPlaceholder");
const { b64Encode } = require("./utils/b64Encode");

/**
 * Retrieves information about a movie or TV show from Allocine.
 * @param {string} allocineHomepage - The URL of the Allocine page for the movie or TV show.
 * @param {string} betaseriesHomepage - The URL of the Betaseries page for the movie or TV show.
 * @param {string} theMoviedbId - The ID of the movie or TV show on The Movie Database.
 * @returns An object containing information about the movie or TV show, including its title, image, placeholder,
 * users rating, number of seasons (if applicable), and trailer.
 */
const getAllocineFirstInfo = async (allocineHomepage, betaseriesHomepage, theMoviedbId) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = { validateStatus: (status) => status === 200 };
    const $ = await getCheerioContent(allocineHomepage, options);

    const title = $('meta[property="og:title"]').attr("content");

    let image = $('meta[property="og:image"]').attr("content");
    if (image.includes("empty_portrait")) image = await getImageFromTMDB(allocineHomepage, theMoviedbId);

    const result = await cloudinary.uploader.upload(image, { public_id: b64Encode(image) });
    image = result.url;

    const { width, height } = await getPlaceholder(image);
    const placeholder = cloudinary.url(b64Encode(image), { width: width, height: height });

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
      allocinePlaceholder: placeholder,
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
