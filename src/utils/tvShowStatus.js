const { formatDate } = require("./formatDate");

/**
 * Parses a release date string into a valid Date object.
 * @param {string|Date|null|undefined} releaseDate - Raw release date value.
 * @returns {Date|null} Normalized date or null when invalid.
 */
const parseReleaseDate = (releaseDate) => {
  if (!releaseDate) return null;

  const parsedDate = new Date(releaseDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/**
 * Determines whether a TV show has ended based on status and last episode date.
 * @param {string} status - Allocine status string (e.g., "Ended").
 * @param {{ release_date?: string }} [lastWhatsOnEpisode] - Latest episode from What's on? API.
 * @returns {boolean} True when the show is marked ended and the last episode aired before today.
 */
const hasTvShowEnded = (status, lastWhatsOnEpisode) => {
  if (status !== "Ended") {
    return false;
  }

  const releaseDate = parseReleaseDate(lastWhatsOnEpisode?.release_date);
  if (!releaseDate) {
    return false;
  }

  const formattedReleaseDate = formatDate(releaseDate);
  const formattedToday = formatDate(new Date());

  if (!formattedReleaseDate || !formattedToday) {
    return false;
  }

  return formattedReleaseDate < formattedToday;
};

module.exports = { hasTvShowEnded };
