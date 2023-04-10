/**
 * Returns the English equivalent of the given French status string.
 * @param {string} status - the French status string to convert
 * @returns {string | null} - the English equivalent of the status string, or null if the status string is not recognized
 */
const getStatus = async (status) => {
  try {
    if (status === "Terminée") return "Ended";
    if (status === "En cours") return "Ongoing";
    if (status === "Annulée") return "Canceled";

    return null;
  } catch (error) {
    console.log(`getStatus - ${status}: ${error}`);
  }
};

module.exports = { getStatus };
