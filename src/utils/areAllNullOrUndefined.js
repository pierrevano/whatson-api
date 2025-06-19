/**
 * Checks if all specified keys in a data object are null or undefined.
 *
 * @param {Object} data - The object to check.
 * @param {string[]} keys - The list of keys to verify in the data object.
 * @returns {boolean} true if all specified keys are null or undefined, false otherwise.
 */
function areAllNullOrUndefined(data, keys) {
  return keys.every((key) => data[key] === null || data[key] === undefined);
}

module.exports = { areAllNullOrUndefined };
