/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Importing the function `getCheerioContent` from the file `getCheerioContent.js` in the folder
`utils`. */
const { getCheerioContent } = require("./utils/getCheerioContent");

/**
 * Retrieves the Metacritic rating for a given IMDb homepage.
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the Metacritic rating information.
 * The object has the following properties:
 * - id: The ID of the Metacritic page.
 * - url: The URL of the Metacritic page.
 * - usersRating: The user rating on Metacritic.
 * - criticsRating: The critic rating on Metacritic.
 * - criticsNumber: The number of critics who have rated the movie.
 * - criticsRatingDetails: An array of objects containing the name of the critic and their rating.
 */
const getMetacriticRating = async (imdbHomepage) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    };
    let $ = await getCheerioContent(`${imdbHomepage}criticreviews`, options);

    let metacriticObj = null;
    const metacriticLinkFromImdb = $('li[data-testid="metacritic-link"] a').attr("href");

    if (metacriticLinkFromImdb && metacriticLinkFromImdb.startsWith("https://www.metacritic.com")) {
      const id = metacriticLinkFromImdb.split("?")[0].split("/")[4];
      const url = metacriticLinkFromImdb.split("?")[0];

      $ = await getCheerioContent(`${url}/critic-reviews`, options);
      let criticsRating = parseInt($(".score_wrapper .metascore_w").text());
      if (isNaN(criticsRating)) criticsRating = null;

      let usersRating = parseFloat($(".score_user .metascore_w").text());
      if (isNaN(usersRating)) usersRating = null;

      const criticName = $(".critic_reviews .right.fl .title .source")
        .map((_i, element) => (typeof element.children[0].children[0].data !== "undefined" ? element.children[0].children[0].data : element.children[0].children[0].attribs.title))
        .get()
        .filter((el) => typeof el === "string");

      const criticRating = $(".critic_reviews .left.fl div")
        .map((_i, element) => element.children[0].data)
        .get()
        .filter((el) => typeof el === "string");

      let criticsRatingDetails = criticName.map((el, i) => {
        return { critic_name: el, critic_rating: parseInt(criticRating[i]) };
      });
      if (criticsRatingDetails.length === 0) criticsRatingDetails = null;

      let criticsRatingLength = criticsRatingDetails.length;
      if (criticsRatingLength === 0) criticsRatingLength = null;

      metacriticObj = {
        id: id,
        url: url,
        usersRating: usersRating,
        criticsRating: criticsRating,
        criticsNumber: criticsRatingLength,
        criticsRatingDetails: criticsRatingDetails,
      };
    }

    return metacriticObj;
  } catch (error) {
    console.log(`getMetacriticRating - ${imdbHomepage}: ${error}`);
  }
};

module.exports = { getMetacriticRating };
