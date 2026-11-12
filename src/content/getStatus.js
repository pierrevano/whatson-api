const { config } = require("../config");
const { logAndAppendTempErrorLog, logErrors } = require("../utils/logErrors");

/**
 * Normalizes a TV show status.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {string|undefined} status - The source status to normalize.
 * @returns {Promise<string|null>} The normalized status, or null for movies or unrecognized statuses.
 */
const getStatus = async (allocineHomepage, status) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  try {
    switch (status) {
      case "Canceled":
        return "Canceled";
      case "In Production":
      case "Planned":
      case "Returning Series":
        return "Ongoing";
      case "Pilot":
        return "Pilot";
      case "Ended":
        return "Ended";
      case "":
        return "Unknown";
      default:
        logAndAppendTempErrorLog(
          `${allocineHomepage} - Unrecognized status: ${status}`,
        );
        return null;
    }
  } catch (error) {
    logErrors(error, status, "getStatus");
  }
};

module.exports = { getStatus };
