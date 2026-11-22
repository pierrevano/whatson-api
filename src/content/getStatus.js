const { config } = require("../config");
const { getAllocineInfo } = require("./getAllocineInfo");
const { logAndAppendTempErrorLog, logErrors } = require("../utils/logErrors");

/**
 * Normalizes a TV show status.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {string|null|undefined} status - The source status to normalize.
 * @param {{ status: string|null }|null} [allocineInfo] - The item's AlloCiné metadata.
 * @returns {Promise<string|null>} The normalized status, or null for movies or unrecognized statuses.
 * @throws {Error} If the metadata lookup rejects.
 */
const getStatus = async (allocineHomepage, status, allocineInfo) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  if (status == null) {
    const metadata =
      allocineInfo === undefined
        ? await getAllocineInfo(allocineHomepage, false)
        : allocineInfo;
    status = metadata?.status ?? status;
  }

  try {
    switch (status) {
      case "Canceled":
      case "Annulée":
        return "Canceled";
      case "In Production":
      case "Planned":
      case "Returning Series":
      case "En cours":
        return "Ongoing";
      case "Pilot":
      case "Pilote":
        return "Pilot";
      case "Ended":
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
