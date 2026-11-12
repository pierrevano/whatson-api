/**
 * Validates whether a specified property of an item is within a given numerical range.
 * Additionally, it verifies if the property's value is a number, and optionally checks if the value
 * is strictly greater than a minimum value.
 *
 * @param {Object|null} item - The rating source, or null when unavailable.
 * @param {string} property - The name of the property within the item object to validate.
 * @param {number} minRating - The minimum acceptable value for the property's value.
 * @param {number} maxRating - The maximum acceptable value for the property's value.
 * @param {boolean} [isStrict=false] - If true, the function checks if the property's value is strictly
 *                                     greater than `minRating`. If false, the check is inclusive (greater than or equal to).
 * @returns {void}
 * @throws {Error} If the source is undefined or a non-null rating fails validation.
 */
function checkRatings(item, property, minRating, maxRating, isStrict = false) {
  expect(item).toBeDefined();
  if (item && item[property] !== null) {
    if (isStrict) {
      try {
        expect(item[property]).toBeGreaterThan(minRating);
      } catch (error) {
        console.log(item);
        throw error;
      }
    } else {
      expect(item[property]).toBeGreaterThanOrEqual(minRating);
    }
    expect(item[property]).toBeLessThanOrEqual(maxRating);
  }
}

module.exports = { checkRatings };
