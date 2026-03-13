const { config } = require("../config");
const { getAllocinePopularity } = require("./getAllocinePopularity");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the IMDb popularity rank for a movie or tvshow and reconciles it with AlloCiné popularity.
 * @param {string} imdbHomepage - The IMDb homepage URL for the movie or tvshow.
 * @param {string} allocineURL - The AlloCiné URL used to fetch AlloCiné popularity.
 * @param {string} item_type - Type of item ("movie" or "tvshow").
 * @param {object|null} [imdbData] - IMDb data.
 * @returns {Promise<{ popularity: number | null } | undefined>} The IMDb popularity information, or undefined if the lookup fails.
 */
const getImdbPopularity = async (
  imdbHomepage,
  allocineURL,
  item_type,
  imdbData,
) => {
  try {
    const $ = imdbData?.$;
    const nextData = imdbData?.nextData;

    let popularity = null;

    const nextPopularity =
      nextData?.props?.pageProps?.aboveTheFoldData?.meterRanking?.currentRank;
    const parsedPopularity = Number(nextPopularity);
    if (Number.isFinite(parsedPopularity)) {
      popularity = parsedPopularity;
    }

    if (popularity === null && typeof $ === "function") {
      const rawPopularity = $(
        'div[data-testid="hero-rating-bar__popularity__score"]',
      )
        .first()
        .text()
        .trim();
      if (rawPopularity !== "") {
        const fallbackPopularity = parseInt(
          rawPopularity.replace(/,/g, ""),
          10,
        );
        popularity = Number.isNaN(fallbackPopularity)
          ? null
          : fallbackPopularity;
      }
    }

    const allocinePopularity = (
      await getAllocinePopularity(allocineURL, item_type)
    ).popularity;
    const popularityResult =
      typeof popularity === "number" &&
      typeof allocinePopularity === "number" &&
      popularity - allocinePopularity > config.maxPopularityDiff
        ? null
        : popularity;

    return {
      popularity: popularityResult,
    };
  } catch (error) {
    logErrors(error, imdbHomepage, "getImdbPopularity");
  }
};

module.exports = { getImdbPopularity };
