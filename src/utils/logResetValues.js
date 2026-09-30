const { config } = require("../config");
const { logAndAppendTempErrorLog } = require("./logErrors");

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Logs and reports values that would be cleared or protected counts that would decrease.
 * Nested keys are walked the same way, except for the keys allowed to be reset.
 * Numeric *_count fields are checked for decreases.
 * Counts within configured exclusions are allowed to decrease.
 * The script is aborted after logging when ABORT_ON_VALUE_RESET is enabled.
 *
 * @param {Object} data - The refreshed payload.
 * @param {Object} storedData - The payload currently stored.
 * @param {string} allocineURL - The AlloCiné URL
 * @param {string} [path] - The path of the key being walked.
 * @returns {boolean} Whether a value would be reset or a protected count would decrease.
 */
const logResetValues = (data, storedData, allocineURL, path = "") => {
  if (!isObject(data) || !isObject(storedData)) return false;

  let hasReset = false;
  for (const [key, storedValue] of Object.entries(storedData)) {
    if (config.keysToReset.includes(key) || storedValue == null) continue;

    const keyPath = path ? `${path}.${key}` : key;
    const newValue = data[key];
    const countWouldDecrease =
      key.endsWith("_count") &&
      !config.keysToAllowCountDecrease.includes(path.split(".")[0]) &&
      Number.isFinite(storedValue) &&
      Number.isFinite(newValue) &&
      newValue < storedValue;

    if (newValue == null || countWouldDecrease) {
      logAndAppendTempErrorLog(
        countWouldDecrease
          ? `${allocineURL} - ${keyPath} would decrease (stored=${storedValue}, new=${newValue}).`
          : `${allocineURL} - ${keyPath} would be reset (stored=${JSON.stringify(storedValue)}).`,
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
