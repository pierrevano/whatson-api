const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getHomepageResponse } = require("../utils/getHomepageResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Derives season metadata from the episodes payload, ensuring the latest season number
 * matches the count of seasons aired up to the current year.
 *
 * @param {{
 *   seasons?: Array<{ number: number|string }>,
 *   years?: Array<{ year: number }>
 * }} episodesInfo - Episode metadata extracted from the IMDb payload.
 * @returns {number|null} Count of seasons validated against the latest season number, or null when inconsistent.
 */
const determineSeasonsInfo = (episodesInfo) => {
  if (!episodesInfo || !Array.isArray(episodesInfo.seasons)) {
    return null;
  }

  const seasons = episodesInfo.seasons;
  const years = Array.isArray(episodesInfo.years) ? episodesInfo.years : [];
  const currentYear = new Date().getFullYear();

  let currentSeason = null;
  let countedSeasons = 0;

  seasons.forEach((season, index) => {
    const seasonNumber = parseInt(season?.number, 10);
    if (Number.isNaN(seasonNumber)) {
      throw new Error("Failed to parse the season number.");
    }

    const seasonYear = years[index]?.year;
    if (typeof seasonYear !== "number" || Number.isNaN(seasonYear)) {
      return;
    }

    if (seasonYear > currentYear) {
      return;
    }

    countedSeasons += 1;
    if (currentSeason === null || seasonNumber > currentSeason) {
      currentSeason = seasonNumber;
    }
  });

  if (
    !countedSeasons ||
    currentSeason === null ||
    countedSeasons !== currentSeason
  ) {
    return null;
  }

  return countedSeasons;
};

/**
 * It takes an imdbHomepage as an argument, and returns the usersRating, usersRatingCount,
 * isAdult flag, runtime (in seconds), certification rating, and topRanking position of the item. The data is extracted
 * from the embedded JSON structure found in the IMDb page content.
 *
 * @param {string} imdbHomepage - The IMDb homepage URL of the item
 * @returns {Promise<{
 *   usersRating: number|null,
 *   usersRatingCount: number|null,
 *   isAdult: boolean|null,
 *   runtime: number|null,
 *   certification: string|null,
 *   topRanking: number|null,
 *   seasonsNumber: number|null
 * }>} Resolves with the IMDb users rating, vote count, adult flag, runtime in seconds, certification rating,
 *     top ranking position, and the number of seasons.
 */
const getImdbRating = async (imdbHomepage) => {
  let usersRating = null;
  let usersRatingCount = null;
  let isAdult = null;
  let runtime = null;
  let certification = null;
  let topRanking = null;
  let seasonsNumber = null;

  try {
    axiosRetry(axios, {
      retries: config.retries,
      retryDelay: () => config.retryDelay,
    });

    await getHomepageResponse(imdbHomepage, {
      serviceName: "IMDb",
      allowedStatuses: [200, 202],
    });

    const $ = await getCheerioContent(imdbHomepage, undefined, "getImdbRating");

    const jsonText = $("#__NEXT_DATA__").html();

    if (!jsonText) {
      throw new Error("IMDb NEXT_DATA payload is missing.");
    }

    let nextData;
    try {
      nextData = JSON.parse(jsonText);
    } catch (parseError) {
      throw new Error("IMDb NEXT_DATA payload is invalid.");
    }

    const mainColumnData = nextData?.props?.pageProps?.mainColumnData;
    const aboveTheFoldData = nextData?.props?.pageProps?.aboveTheFoldData;

    if (!mainColumnData || !aboveTheFoldData) {
      throw new Error("IMDb NEXT_DATA payload is missing required fields.");
    }

    const ratingsSummary = mainColumnData?.ratingsSummary;
    const runtimeSeconds = mainColumnData?.runtime?.seconds;
    const certificate = aboveTheFoldData?.certificate?.rating;
    const episodesInfo = mainColumnData?.episodes;

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
    certification =
      typeof certificate === "string" && certificate.trim().length > 0
        ? certificate.trim()
        : null;
    topRanking = isNaN(parsedTopRanking) ? null : parsedTopRanking;

    const validatedSeasonsCount = determineSeasonsInfo(episodesInfo);
    if (Number.isInteger(validatedSeasonsCount)) {
      seasonsNumber = validatedSeasonsCount;
    }
  } catch (error) {
    logErrors(error, imdbHomepage, "getImdbRating");
  }

  return {
    usersRating,
    usersRatingCount,
    isAdult,
    runtime,
    certification,
    topRanking,
    seasonsNumber,
  };
};

module.exports = { getImdbRating };
