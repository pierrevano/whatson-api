/**
 * A map of French month names to their corresponding two-digit month numbers.
 * @type {Object.<string, string>}
 */
const monthMap = {
  janvier: "01",
  février: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  août: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  décembre: "12",
};

/**
 * Converts a French date string to an ISO 8601 date string.
 *
 * @param {string} frenchDateStr - The date string in French format (e.g., "12 mars 2023" or "juin 1960").
 * @returns {string} - The ISO 8601 formatted date string (e.g., "2023-03-12T00:00:00.000Z").
 * @throws Will throw an error if the input date string is invalid or if the month is not recognized.
 */
const convertFrenchDateToISOString = (frenchDateStr) => {
  if (frenchDateStr.includes("Date de sortie inconnue")) {
    return null;
  }

  const regexWithDay = /(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i;
  const regexWithoutDay = /([a-zéû]+)\s+(\d{4})/i;

  let match = frenchDateStr.match(regexWithDay);
  let day = "01"; // Default day is the first day of the month

  if (!match) {
    match = frenchDateStr.match(regexWithoutDay); // Try matching without the day part
  }

  if (match) {
    if (match.length === 4) {
      day = match[1];
      month = match[2].toLowerCase();
      year = match[3];
    } else if (match.length === 3) {
      month = match[1].toLowerCase();
      year = match[2];
    }
    const monthNumber = monthMap[month];

    if (monthNumber) {
      const dateStr = `${year}-${monthNumber}-${day.padStart(2, "0")}`;
      const date = new Date(dateStr);
      return date.toISOString();
    } else {
      throw new Error("Invalid month in the input date string.");
    }
  } else {
    throw new Error("Invalid input date string.");
  }
};

module.exports = { convertFrenchDateToISOString };
