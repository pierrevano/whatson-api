const { config } = require("../config");
const { logAndAppendTempErrorLog } = require("./logErrors");

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Logs and reports values that would be cleared by an update.
 * Nested keys are walked the same way, except for the keys allowed to be reset.
 * The script is aborted after logging when ABORT_ON_VALUE_RESET is enabled.
 *
 * @param {Object} data - The refreshed payload.
 * @param {Object} storedData - The payload currently stored.
 * @param {string} allocineHomepage - URL identifying the item.
 * @param {string} [path] - The path of the key being walked.
 * @returns {boolean} Whether a value would be reset.
 */
const logResetValues = (data, storedData, allocineHomepage, path = "") => {
  if (!isObject(data) || !isObject(storedData)) return false;

  let hasReset = false;
  for (const [key, storedValue] of Object.entries(storedData)) {
    if (config.keysToReset.includes(key) || storedValue == null) continue;

    const keyPath = path ? `${path}.${key}` : key;

    if (data[key] == null) {
      logAndAppendTempErrorLog(
        `${allocineHomepage} - ${keyPath} would be reset (stored=${JSON.stringify(storedValue)}).`,
      );

      if (process.env.ABORT_ON_VALUE_RESET === "true") process.exit(1);

      hasReset = true;
      continue;
    }

    if (logResetValues(data[key], storedValue, allocineHomepage, keyPath)) {
      hasReset = true;
    }
  }

  return hasReset;
};

module.exports = { logResetValues };
