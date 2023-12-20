const { getCheerioContent } = require("./utils/getCheerioContent");
const { logErrors } = require("./utils/logErrors");

/**
 * It takes a betaseriesHomepage as an argument, and returns the criticsRating of the show
 * @param betaseriesHomepage - the URL of the show's page on betaseries.com
 * @returns The critics rating of the movie from betaseries.com
 */
const getBetaseriesUsersRating = async (betaseriesHomepage) => {
  let criticsRating = null;
  let errorCounter = 0;

  try {
    if (!betaseriesHomepage.includes("null")) {
      const options = { validateStatus: (status) => status === 200 };
      const $ = await getCheerioContent(betaseriesHomepage, options);

      const numberOfStars = $(".js-render-stars")[0];
      criticsRating = numberOfStars ? parseFloat(numberOfStars.attribs.title.replace(" / 5", "").replace(",", ".")) : null;

      /**
       * The value `criticsRating` received as `0` doesn't necessarily signify a rating of zero.
       * It could also indicate that no ratings have been given.
       * Therefore, it is not considered.
       */
      if (criticsRating === 0) criticsRating = null;
    } else {
      criticsRating = null;
    }

    errorCounter = 0;
  } catch (error) {
    logErrors(errorCounter, error, betaseriesHomepage);
  }

  return criticsRating;
};

module.exports = { getBetaseriesUsersRating };
