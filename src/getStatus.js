/**
 * Returns the English equivalent of the given French status string.
 * @param {string} status - the French status string to convert
 * @returns {string | null} - the English equivalent of the status string, or throws an Error if the status string is not recognized
 */
const getStatus = async (status) => {
  try {
    switch (status) {
      case "À venir":
        return "Soon";
      case "Annulée":
        return "Canceled";
      case "En cours":
        return "Ongoing";
      case "Pilote":
        return "Pilot";
      case "Terminée":
        return "Ended";
      default:
        throw new Error(`Unrecognized status: ${status}`);
    }
  } catch (error) {
    console.log(`getStatus - ${status}: ${error}`);
  }
};

module.exports = { getStatus };
