const { config } = require("../../src/config");

const RATING_KEY_REGEX = /_rating(_count)?$/;

/**
 * Asserts that an item exposes only the allowed rating sources and keys.
 *
 * @param {Object} item - The item returned by the API.
 * @param {Object} requestedRatingKeys - The rating keys allowed for each platform.
 */
function expectRatingKeys(item, requestedRatingKeys) {
  config.ratingsKeys.forEach((platform) => {
    if (!requestedRatingKeys[platform]) {
      expect(item[platform]).toBeUndefined();
      return;
    }

    Object.keys(item[platform] || {}).forEach((key) => {
      if (!RATING_KEY_REGEX.test(key)) return;

      expect(requestedRatingKeys[platform]).toContain(key);
    });
  });
}

module.exports = { expectRatingKeys };
