/**
 * Converts a date input into a string in the format YYYY-MM-DD (UTC).
 * @param {string|Date} date - The input date (can be a Date object or ISO string).
 * @returns {string} The date formatted as 'YYYY-MM-DD'.
 */
const formatDate = (date) => {
  if (!date) return null;

  try {
    return new Date(date).toISOString().split("T")[0];
  } catch (error) {
    console.error("Invalid date input passed to formatDate:", date);
    return null;
  }
};

module.exports = { formatDate };
