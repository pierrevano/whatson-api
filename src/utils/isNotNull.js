/**
 * Normalizes incoming identifiers by mapping literal `null` strings to real null values.
 *
 * @param {string|number|null} id - Identifier value read from external sources.
 * @returns {string|number|null} The original identifier or null when a null sentinel is detected.
 */
function isNotNull(id) {
  if (id === null || id === "null") {
    return null;
  } else {
    return id;
  }
}

module.exports = { isNotNull };
