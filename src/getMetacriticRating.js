/* Importing the libraries that are needed for the script to work. */
const axiosRetry = require("axios-retry");
const axios = require("axios");

/* Importing the function `getCheerioContent` from the file `getCheerioContent.js` in the folder
`utils`. */
const { getCheerioContent } = require("./utils/getCheerioContent");

/**
 * Retrieves the Metacritic rating for a given movie or TV show.
 * @param {string} imdbHomepage - The IMDb homepage URL for the movie or TV show.
 * @param {string} metacriticHomepage - The Metacritic homepage URL.
 * @param {string} metacriticId - The Metacritic ID for the movie or TV show.
 * @returns {Promise<Object>} - An object containing the Metacritic rating information.
 * @throws {Error} - If there is an error retrieving the Metacritic rating.
 */
const getMetacriticRating = async (imdbHomepage, metacriticHomepage, metacriticId) => {
  try {
    let metacriticObj = null;
    let metacriticLink;
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    };
    if (!metacriticId || metacriticId === "null") {
      axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
      let $ = await getCheerioContent(`${imdbHomepage}criticreviews`, options);
      metacriticLink = $('li[data-testid="metacritic-link"] a').attr("href");
    } else {
      metacriticLink = metacriticHomepage;
    }

    if (metacriticLink && metacriticLink.startsWith("https://www.metacritic.com")) {
      const id = metacriticLink.includes("?") ? metacriticLink.split("?")[0].split("/")[4] : metacriticId;
      const url = metacriticLink.includes("?") ? metacriticLink.split("?")[0] : metacriticHomepage;

      $ = await getCheerioContent(`${url}`, options);
      let usersRating = parseFloat($(".metascore_w.user").first().text());
      if (isNaN(usersRating)) usersRating = null;

      $ = await getCheerioContent(`${url}/critic-reviews`, options);
      let criticsRating = parseInt($(".score_wrapper .metascore_w").text());
      if (isNaN(criticsRating)) criticsRating = null;

      let criticName = $(".critic_reviews .right.fl .title .source")
        .map((_i, element) => (typeof element.children[0].children[0].data !== "undefined" ? element.children[0].children[0].data : element.children[0].children[0].attribs.title))
        .get()
        .filter((el) => typeof el === "string");

      let criticRating = $(".critic_reviews .left.fl div")
        .map((_i, element) => element.children[0].data)
        .get()
        .filter((el) => typeof el === "string");

      const hasOverHundredsOfCritics = parseInt($(".based_on").text().replace("based on", "").replace("Critic Reviews", "").trim()) > 100;
      if (hasOverHundredsOfCritics) {
        const criticNameGlobal = [criticName];
        const criticRatingGlobal = [criticRating];
        for (let index = 1; index < $(".page_num").length; index++) {
          $ = await getCheerioContent(`${url}/critic-reviews?page=${index}`, options);

          const criticNameAdditional = $(".critic_reviews .right.fl .title .source")
            .map((_i, element) => (typeof element.children[0].children[0].data !== "undefined" ? element.children[0].children[0].data : element.children[0].children[0].attribs.title))
            .get()
            .filter((el) => typeof el === "string");
          criticNameGlobal.push(criticNameAdditional);

          const criticRatingAdditional = $(".critic_reviews .left.fl div")
            .map((_i, element) => element.children[0].data)
            .get()
            .filter((el) => typeof el === "string");
          criticRatingGlobal.push(criticRatingAdditional);
        }
        criticName = criticNameGlobal.flat();
        criticRating = criticRatingGlobal.flat();
      }

      let criticsRatingDetails = criticName.map((el, i) => {
        return { critic_name: el, critic_rating: parseInt(criticRating[i]) };
      });

      if (criticsRating === null && criticRating.length > 0) {
        const criticsRatingNumber = criticRating.length;
        let criticsRatingTotal = 0;
        criticsRatingDetails.forEach((element) => {
          criticsRatingTotal += element.critic_rating;
        });
        criticsRating = parseInt(Number(criticsRatingTotal / criticsRatingNumber).toFixed(0));
        if (isNaN(criticsRating)) criticsRating = null;
      }

      let criticsRatingLength = criticsRatingDetails.length;
      if (criticsRatingLength === 0) criticsRatingLength = null;
      if (criticsRatingDetails.length === 0) criticsRatingDetails = null;

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
