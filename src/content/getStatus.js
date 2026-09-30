const { config } = require("../config");
const { logAndAppendTempErrorLog, logErrors } = require("../utils/logErrors");

/**
 * Returns the English equivalent of the given French status string for a specific AlloCiné page.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {string} status - The French status string to convert.
 * @returns {Promise<string|null>} The English status, or null for movies or unrecognized statuses. Errors are passed to logErrors.
 */
const getStatus = async (allocineHomepage, status) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  try {
    switch (status) {
      case "Annulée":
        return "Canceled";
      case "En cours":
        return "Ongoing";
      case "Pilote":
        return "Pilot";
      case "Terminée":
      case "mini-série":
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
