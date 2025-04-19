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
 * @param {string} frenchDateStr - The date string in French format (e.g., "12 mars 2023", "juin 1960", "1960", "Depuis 2024", "2020 - 2024").
 * @param {boolean} [isTVShow=false] - If true, it will handle special cases for TV shows and ensure the year is less or equal than the current year.
 * @returns {string|null} - The ISO 8601 formatted date string (e.g., "2023-03-12T00:00:00.000Z") or null if the date string is unknown or invalid.
 * @throws Will throw an error if the input date string format is invalid or if the month is not recognized.
 */
function convertFrenchDateToISOString(frenchDateStr, isTVShow = false) {
  if (/Date de sortie inconnue|Prochainement/.test(frenchDateStr)) {
    return null;
  }

  if (isTVShow) {
    const yearMatch = frenchDateStr.match(/\b(\d{4})\b/);
    const currentYear = new Date().getFullYear();
    if (yearMatch && parseInt(yearMatch[1]) <= currentYear) {
      return `${yearMatch[1]}-01-01T00:00:00.000Z`;
    } else {
      return null;
    }
  }

  const parseDate = (regex) => {
    const match = frenchDateStr.match(regex);
    return match ? match.slice(1) : null;
  };

  const dayMonthYear = parseDate(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
  const monthYear = parseDate(/([a-zéû]+)\s+(\d{4})/i);
  const yearOnly = parseDate(/(\d{4})/i);

  let day = "01";
  let month, year;

  if (dayMonthYear) {
    [day, month, year] = dayMonthYear;
  } else if (monthYear) {
    [month, year] = monthYear;
  } else if (yearOnly) {
    [year] = yearOnly;
    return `${year}-01-01T00:00:00.000Z`;
  } else {
    throw new Error("Invalid date format in the input date string.");
  }

  month = month && month.toLowerCase();
  const monthNumber = monthMap[month];

  if (monthNumber) {
    const dateStr = `${year}-${monthNumber}-${day.padStart(2, "0")}`;
    const date = new Date(dateStr);
    return date.toISOString();
  } else {
    throw new Error("Invalid month in the input date string.");
  }
}

/**
 * Converts a structured release date object (with year, optional month and day)
 * to an ISO 8601 date string.
 *
 * @param {{ year: number, month?: number, day?: number }} releaseDate - The release date object.
 * @returns {string|null} - The ISO 8601 date string or null if input is missing or invalid.
 */
function convertImdbDateToISOString(releaseDate) {
  if (!releaseDate?.year) return null;

  const { year, month, day } = releaseDate;

  if (year && month && day) {
    const paddedMonth = String(month).padStart(2, "0");
    const paddedDay = String(day).padStart(2, "0");
    return `${year}-${paddedMonth}-${paddedDay}T00:00:00.000Z`;
  }

  if (year && month) {
    const paddedMonth = String(month).padStart(2, "0");
    return `${year}-${paddedMonth}-01T00:00:00.000Z`;
  }

  if (year) {
    return `${year}-01-01T00:00:00.000Z`;
  }

  return null;
}

module.exports = { convertFrenchDateToISOString, convertImdbDateToISOString };
