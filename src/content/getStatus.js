const { appendFile } = require("fs");

const { config } = require("../config");
const { logErrors } = require("../utils/logErrors");

/**
 * Returns the English equivalent of the given French status string for a specific AlloCiné page.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {string} status - The French status string to convert.
 * @returns {Promise<string | null | undefined>} The English status, null when it cannot be mapped, or undefined on error.
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
        console.error(`Unrecognized status: ${status}`);
        appendFile(
          "temp_error.log",
          `${new Date().toISOString()} - ${allocineHomepage} - Unrecognized status: ${status}\n`,
          () => {},
        );
        return null;
    }
  } catch (error) {
    logErrors(error, status, "getStatus");
  }
};

module.exports = { getStatus };
