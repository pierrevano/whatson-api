const RATING_KEY_REGEX = /_rating(_count)?$/;

/**
 * Asserts that an item exposes no rating key outside the allowed ones.
 *
 * @param {Object} item - The item returned by the API.
 * @param {Object} requestedRatingKeys - The rating keys allowed for each platform.
 */
function expectRatingKeys(item, requestedRatingKeys) {
  Object.entries(item).forEach(([platform, value]) => {
    if (!value || typeof value !== "object") return;

    Object.keys(value).forEach((key) => {
      if (!RATING_KEY_REGEX.test(key)) return;

      expect(requestedRatingKeys[platform] || []).toContain(key);
    });
  });
}

module.exports = { expectRatingKeys };
