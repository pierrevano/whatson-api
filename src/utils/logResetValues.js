const { logAndAppendTempErrorLog } = require("./logErrors");

const keysToReset = [
  "episodes_details",
  "highest_episode",
  "last_episode",
  "lowest_episode",
  "next_episode",
  "popularity",
  "popularity_average",
  "ratings_average",
];

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Logs when the refreshed payload resets a key that currently holds a value.
 * Nested keys are walked the same way, except for the keys allowed to be reset.
 * Nothing is logged when FORCE_RESET is enabled.
 *
 * @param {Object} data - The refreshed payload.
 * @param {Object} storedData - The payload currently stored.
 * @param {string} [path] - The path of the key being walked.
 * @returns {void}
 */
const logResetValues = (data, storedData, path = "") => {
  if (process.env.FORCE_RESET === "true") return;
  if (!isObject(data) || !isObject(storedData)) return;

  Object.entries(storedData).forEach(([key, storedValue]) => {
    if (keysToReset.includes(key) || storedValue == null) return;

    const keyPath = path ? `${path}.${key}` : key;

    if (data[key] == null) {
      logAndAppendTempErrorLog(
        `${keyPath} is reset (stored=${JSON.stringify(storedValue)}).`,
      );
      return;
    }

    logResetValues(data[key], storedValue, keyPath);
  });
};

module.exports = { logResetValues };
