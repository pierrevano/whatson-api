/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Used to load environment variables from a .env file into process.env. */
const dotenv = require("dotenv");
dotenv.config();

/**
 * Creates a new instance of the ImageKit class with the given configuration options.
 * @param {object} options - An object containing the configuration options for the ImageKit instance.
 * @param {string} options.publicKey - The public key for the ImageKit account.
 * @param {string} options.privateKey - The private key for the ImageKit account.
 * @param {string} options.urlEndpoint - The URL endpoint for the ImageKit account.
 * @returns An instance of the ImageKit class that can be used to interact with the ImageKit API.
 */
const ImageKit = require("imagekit");
const imagekit = new ImageKit({
  publicKey: "public_kWyuooikd/guGh+o5zN9/I8z3Ao=",
  privateKey: process.env.IMAGEKIT_API_KEY,
  urlEndpoint: "https://ik.imagekit.io/whatson",
});

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/* Importing the functions from the files getCheerioContent.js, getImageFromTMDB.js and getTrailer.js. */
const { getCheerioContent } = require("./utils/getCheerioContent");
const { getImageFromTMDB } = require("./getImageFromTMDB");
const { getTrailer } = require("./getTrailer");
const { getPlaceholder } = require("./getPlaceholder");

/**
 * Retrieves information about a movie or TV show from Allocine.
 * @param {string} allocineHomepage - The URL of the Allocine page for the movie or TV show.
 * @param {string} betaseriesHomepage - The URL of the Betaseries page for the movie or TV show.
 * @param {number} theMoviedbId - The ID of the movie or TV show on The Movie Database.
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

    const { width, height } = await getPlaceholder(image);

    const kind = allocineHomepage.includes(config.baseURLTypeSeries) ? "tv" : "movie";
    let placeholder;
    image = (await axios.get(`${config.baseURLWhatsonAPI}/${kind}/${theMoviedbId}`)).data.image;

    if (image && image.startsWith(config.baseURLImagekit)) {
      placeholder = (await axios.get(`${config.baseURLWhatsonAPI}/${kind}/${theMoviedbId}`)).data.placeholder;
    } else {
      await imagekit
        .upload({ file: image, fileName: `${image}` })
        .then((response) => {
          image = response.url;

          placeholder = imagekit.url({
            src: image,
            transformation: [
              {
                height: height,
                width: width,
              },
            ],
          });
        })
        .catch((error) => {
          console.log(error);
        });
    }

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
