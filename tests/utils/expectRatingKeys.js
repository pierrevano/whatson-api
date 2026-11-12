const { config } = require("../../src/config");

const RATING_KEY_REGEX = /_rating(_count)?$/;

/**
 * Asserts that an item exposes only the allowed rating sources and keys.
 *
 * @param {Object} item - The item returned by the API.
 * @param {Record<string, string[]>} requestedRatingKeys - The rating keys allowed for each platform.
 * @returns {void}
 * @throws {Error} If rating sources or fields do not match the requested selection.
 */
function expectRatingKeys(item, requestedRatingKeys) {
  config.ratingsKeys.forEach((platform) => {
    if (!requestedRatingKeys[platform]) {
      expect(item).not.toHaveProperty(platform);
      return;
    }

    expect(item[platform]).toBeDefined();
    if (item[platform] === null) return;

    requestedRatingKeys[platform].forEach((key) => {
      expect(item[platform][key]).toBeDefined();
    });

    Object.keys(item[platform]).forEach((key) => {
      if (!RATING_KEY_REGEX.test(key)) return;

      expect(requestedRatingKeys[platform]).toContain(key);
    });
  });
}

module.exports = { expectRatingKeys };
