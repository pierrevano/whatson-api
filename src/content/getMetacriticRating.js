const axios = require("axios");

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");
const { reportError } = require("../utils/sendToNewRelic");

/**
 * It takes a metacriticHomepage as an argument, and returns the users and critics ratings and review counts.
 * It only attempts to fetch and parse the content if a valid metacriticId is provided.
 *
 * @param {string} metacriticHomepage - The Metacritic homepage URL
 * @param {string} metacriticId - The Metacritic ID for the movie or tvshow
 * @returns {{
 *   id: string,
 *   url: string,
 *   usersRating: number|null,
 *   usersRatingCount: number|null,
 *   criticsRating: number|null,
 *   criticsRatingCount: number|null,
 *   mustSee: boolean
 * }|null|{ error: Error }} Metacritic rating data when available, null when
 * nothing can be retrieved, or an error wrapper when the scrape fails
 */
const getMetacriticRating = async (metacriticHomepage, metacriticId) => {
  let metacriticObj = null;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
        Referer: "https://www.metacritic.com/",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
    };

    if (isNotNull(metacriticId)) {
      const $ = await getCheerioContent(
        metacriticHomepage,
        options,
        "getMetacriticRating",
      );

      if (typeof $.html !== "function") {
        const errorMsg = `$.html is not a function - ${metacriticHomepage} - ${metacriticId}`;
        reportError(null, null, 500, new Error(errorMsg));
        return null;
      }

      const type = metacriticHomepage.includes("/tv/") ? "shows" : "movies";

      const [userStats, criticStats] = await Promise.all([
        axios.get(
          `${config.baseURLMetacriticBackend}/user/${type}/${metacriticId}/stats/web`,
          options,
        ),
        axios.get(
          `${config.baseURLMetacriticBackend}/critic/${type}/${metacriticId}/stats/web`,
          options,
        ),
      ]);

      const rawUserData = userStats?.data?.data?.item ?? {};
      const rawCriticData = criticStats?.data?.data?.item ?? {};

      const usersRating =
        rawUserData.score && rawUserData.score !== 0 ? rawUserData.score : null;
      const usersRatingCount =
        usersRating !== null ? (rawUserData.reviewCount ?? null) : null;

      const criticsRating =
        rawCriticData.score && rawCriticData.score !== 0
          ? rawCriticData.score
          : null;
      const criticsRatingCount =
        criticsRating !== null ? (rawCriticData.reviewCount ?? null) : null;

      const mustSee = $(".c-productScoreInfo_must").length > 0;

      metacriticObj = {
        id: metacriticId,
        url: metacriticHomepage,
        usersRating,
        usersRatingCount,
        criticsRating,
        criticsRatingCount,
        mustSee,
      };
    }
  } catch (error) {
    logErrors(error, metacriticHomepage, "getMetacriticRating");

    return { error };
  }

  return metacriticObj;
};

module.exports = { getMetacriticRating };
