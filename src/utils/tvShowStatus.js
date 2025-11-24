const { formatDate } = require("./formatDate");

const SIX_DAYS_IN_MS = 6 * 24 * 60 * 60 * 1000;

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

/**
 * Checks if the last episode aired within a recent time window.
 * @param {{ release_date?: string }} [lastWhatsOnEpisode] - Latest episode from What's on? API.
 * @param {number} [recencyThresholdMs=SIX_DAYS_IN_MS] - Window in milliseconds considered "recent".
 * @returns {boolean} True when the episode aired in the past and within the window.
 */
const wasLastEpisodeReleasedRecently = (
  lastWhatsOnEpisode,
  recencyThresholdMs = SIX_DAYS_IN_MS,
) => {
  const releaseDate = parseReleaseDate(lastWhatsOnEpisode?.release_date);
  if (!releaseDate) {
    return false;
  }

  const now = Date.now();
  const releaseTime = releaseDate.getTime();

  if (releaseTime > now) {
    return false;
  }

  return now - releaseTime < recencyThresholdMs;
};

module.exports = { hasTvShowEnded, wasLastEpisodeReleasedRecently };
