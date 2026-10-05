const { config } = require("../config");
const { logAndAppendTempErrorLog } = require("./logErrors");

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Logs and reports values that would be cleared by an update.
 * Configured reset exclusions are skipped.
 * The script is aborted after logging when ABORT_ON_VALUE_RESET is enabled.
 *
 * @param {Object} data - The refreshed payload.
 * @param {Object} storedData - The payload currently stored.
 * @param {string} allocineURL - The AlloCiné URL
 * @param {string} [path] - The path of the key being walked.
 * @returns {boolean} Whether a value would be reset.
 */
const logResetValues = (data, storedData, allocineURL, path = "") => {
  if (!isObject(data) || !isObject(storedData)) return false;

  let hasReset = false;
  for (const [key, storedValue] of Object.entries(storedData)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (
      config.keysToReset.includes(key) ||
      config.keysToReset.includes(keyPath) ||
      storedValue == null
    ) {
      continue;
    }

    if (data[key] == null) {
      logAndAppendTempErrorLog(
        `${allocineURL} - ${keyPath} would be reset (stored=${JSON.stringify(storedValue)}).`,
      );

      if (process.env.ABORT_ON_VALUE_RESET === "true") process.exit(1);

      hasReset = true;
      continue;
    }

    if (logResetValues(data[key], storedValue, allocineURL, keyPath)) {
      hasReset = true;
    }
  }

  return hasReset;
};

module.exports = { logResetValues };
