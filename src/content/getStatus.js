const { config } = require("../config");
const { logErrors } = require("../utils/logErrors");

/**
 * Returns the English equivalent of the given French status string.
 * @param {string} status - the French status string to convert
 * @returns {string | null} - the English equivalent of the status string, or throws an Error if the status string is not recognized
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
        return "Ended";
      case "":
        return "Unknown";
      default:
        console.error(`Unrecognized status: ${status}`);
        process.exit(1);
    }
  } catch (error) {
    logErrors(error, status, "getStatus");
  }
};

module.exports = { getStatus };
