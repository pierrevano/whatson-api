/**
 * Checks if the given input is in all lowercase letters.
 * @param {string} input - the string to check
 * @returns {boolean} - true if the input is all lowercase, false otherwise.
 */
const isLowerCase = (input) => input === String(input).toLowerCase();

module.exports = isLowerCase;
