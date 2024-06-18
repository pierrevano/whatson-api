const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes a betaseriesHomepage as an argument, and returns the criticsRating of the show
 * @param betaseriesHomepage - the URL of the show's page on betaseries.com
 * @returns The critics rating of the movie from betaseries.com
 */
const getBetaseriesRating = async (betaseriesHomepage, betaseriesId) => {
  let criticsRating = null;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };

    if (isNotNull(betaseriesId)) {
      $ = await getCheerioContent(
        `${betaseriesHomepage}`,
        options,
        "getBetaseriesRating",
      );
      const numberOfStars = $(".js-render-stars")[0];
      criticsRating = numberOfStars
        ? parseFloat(
            numberOfStars.attribs.title.replace(" / 5", "").replace(",", "."),
          )
        : null;

      /**
       * The value `criticsRating` received as `0` doesn't necessarily signify a rating of zero.
       * It could also indicate that no ratings have been given.
       * Therefore, it is not considered.
       */
      if (criticsRating === 0) criticsRating = null;
    }
  } catch (error) {
    logErrors(error, betaseriesHomepage, "getBetaseriesRating");
  }

  return criticsRating;
};

module.exports = { getBetaseriesRating };
