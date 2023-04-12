/**
 * Returns the English equivalent of the given French status string.
 * @param {string} status - the French status string to convert
 * @returns {string | null} - the English equivalent of the status string, or null if the status string is not recognized
 */
const getStatus = async (status) => {
  try {
    if (status === "À venir") return "Soon";
    if (status === "Annulée") return "Canceled";
    if (status === "En cours") return "Ongoing";
    if (status === "Pilote") return "Pilot";
    if (status === "Terminée") return "Ended";

    return null;
  } catch (error) {
    console.log(`getStatus - ${status}: ${error}`);
  }
};

module.exports = { getStatus };
