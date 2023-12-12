const path = require("path");

const { getCheerioContent } = require("./utils/getCheerioContent");
const { config } = require("./config");

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

      criticsRating = parseFloat($(".js-render-stars")[0].attribs.title.replace(" / 5", "").replace(",", "."));
      if (criticsRating === 0) criticsRating = null;
    } else {
      criticsRating = null;
    }

    errorCounter = 0;
  } catch (error) {
    const fileName = path.basename(__filename);

    console.log(`errorCounter: ${errorCounter} - ${fileName} - ${betaseriesHomepage}: ${error}`);

    errorCounter++;
    if (errorCounter > config.maxErrorCounter.default) {
      console.log(`An error on ${fileName} has been returned more than ${config.maxErrorCounter.default} times, exiting the script.`);
      process.exit(1);
    }
  }

  return criticsRating;
};

module.exports = { getBetaseriesUsersRating };
