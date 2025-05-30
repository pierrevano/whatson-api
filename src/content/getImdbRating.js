const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");

/**
 * Extracts the IMDb users rating and number of users rating from an IMDb homepage.
 * @param {string} imdbHomepage - The IMDb homepage URL of the item.
 * @returns {{ usersRating: number | null, usersRatingCount: number | null }}
 */
const getImdbRating = async (imdbHomepage) => {
  let usersRating = null;
  let usersRatingCount = null;

  try {
    axiosRetry(axios, {
      retries: config.retries,
      retryDelay: () => config.retryDelay,
    });
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };
    const $ = await getCheerioContent(imdbHomepage, options, "getImdbRating");

    const jsonText = $("#__NEXT_DATA__").html();
    const nextData = JSON.parse(jsonText);

    const ratingsSummary =
      nextData?.props?.pageProps?.mainColumnData?.ratingsSummary;

    const parsedRating = parseFloat(ratingsSummary?.aggregateRating);
    const parsedCount = parseInt(ratingsSummary?.voteCount, 10);

    usersRating = isNaN(parsedRating) ? null : parsedRating;
    usersRatingCount = isNaN(parsedCount) ? null : parsedCount;
  } catch (error) {
    logErrors(error, imdbHomepage, "getImdbRating");
  }

  return { usersRating, usersRatingCount };
};

module.exports = { getImdbRating };
