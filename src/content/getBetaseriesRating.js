const axios = require("axios");

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes a betaseriesHomepage and allocineHomepage as arguments, and returns the usersRating and usersRatingCount of the item.
 * It only attempts to fetch and parse the content if a valid betaseriesId is provided.
 *
 * @param {string} allocineHomepage - The URL of the item's page on allocine.fr
 * @param {string} betaseriesHomepage - The URL of the item's page on betaseries.com
 * @param {string} betaseriesId - Optional item identifier
 * @returns {{ usersRating: number|null, usersRatingCount: number|null }} An object containing the rating information, or null values if not available
 */
const getBetaseriesRating = async (
  allocineHomepage,
  betaseriesHomepage,
  betaseriesId,
) => {
  let usersRating = null;
  let usersRatingCount = null;

  try {
    if (isNotNull(betaseriesId)) {
      const options = {
        headers: {
          "User-Agent": generateUserAgent(),
        },
        validateStatus: (status) => status < 500,
      };

      const $ = await getCheerioContent(
        betaseriesHomepage,
        options,
        "getBetaseriesRating",
      );

      const BSAppURI = $.html().match(
        /window\.BSAppURI\s*=\s*['"]([^'"]+)['"]/,
      );
      const id = BSAppURI ? BSAppURI[1].split("/")[1] : null;

      if (!id) {
        throw new Error("Failed to fetch the BetaSeries ID.");
      }

      const isSeries = allocineHomepage.includes(config.baseURLTypeSeries);
      const baseURLBetaseriesAPI = isSeries
        ? config.baseURLBetaseriesAPISeries
        : config.baseURLBetaseriesAPIFilms;

      const url = `${baseURLBetaseriesAPI}?id=${id}&key=${config.betaseriesApiKey}`;
      const { data, status } = await axios.get(url, options);
      if (status !== 200) return { usersRating, usersRatingCount };

      const item = isSeries ? data.show : data.movie;

      if (item?.notes) {
        usersRating = parseFloat(item.notes.mean.toFixed(2));
        if (isNaN(usersRating)) usersRating = null;

        usersRatingCount = parseInt(item.notes.total, 10);
        if (isNaN(usersRatingCount)) usersRatingCount = null;
      }

      if (!usersRatingCount || usersRatingCount === 0)
        return { usersRating: null, usersRatingCount: null };
    }
  } catch (error) {
    logErrors(error, betaseriesHomepage, "getBetaseriesRating");
  }

  return { usersRating, usersRatingCount };
};

module.exports = { getBetaseriesRating };
