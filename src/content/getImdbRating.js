const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes an imdbHomepage as an argument, and returns the usersRating, usersRatingCount,
 * isAdult flag, runtime (in seconds), and topRanking position of the item. The data is extracted
 * from the embedded JSON structure found in the IMDb page content.
 *
 * @param {string} imdbHomepage - The IMDb homepage URL of the item
 * @returns {{ usersRating: number|null, usersRatingCount: number|null, isAdult: boolean|null, runtime: number|null, topRanking: number|null }} The IMDb users rating, vote count, adult flag, runtime in seconds, and top ranking position
 */
const getImdbRating = async (imdbHomepage) => {
  let usersRating = null;
  let usersRatingCount = null;
  let isAdult = null;
  let runtime = null;
  let topRanking = null;

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

    const mainColumnData = nextData?.props?.pageProps?.mainColumnData;

    const ratingsSummary = mainColumnData?.ratingsSummary;
    const runtimeSeconds = mainColumnData?.runtime?.seconds;

    const parsedRating = parseFloat(ratingsSummary?.aggregateRating);
    const parsedCount = parseInt(ratingsSummary?.voteCount, 10);
    const parsedTopRanking = parseInt(ratingsSummary?.topRanking?.rank, 10);

    usersRating = isNaN(parsedRating) ? null : parsedRating;
    usersRatingCount = isNaN(parsedCount) ? null : parsedCount;
    isAdult =
      typeof mainColumnData?.isAdult === "boolean"
        ? mainColumnData.isAdult
        : null;
    runtime = Number.isInteger(runtimeSeconds)
      ? runtimeSeconds
      : parseInt(runtimeSeconds, 10);
    runtime = Number.isNaN(runtime) ? null : runtime;
    topRanking = isNaN(parsedTopRanking) ? null : parsedTopRanking;
  } catch (error) {
    logErrors(error, imdbHomepage, "getImdbRating");
  }

  return { usersRating, usersRatingCount, isAdult, runtime, topRanking };
};

module.exports = { getImdbRating };
