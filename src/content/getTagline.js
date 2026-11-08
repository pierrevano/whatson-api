const { b64Encode } = require("../utils/b64EncodeAndDecode");
const { collectionData } = require("../utils/mongoClient");
const { logErrors } = require("../utils/logErrors");

/**
 * Returns the stored tagline, falling back to provided metadata when unavailable.
 *
 * @param {string} allocineHomepage - The item's source URL.
 * @param {{ tagline?: string|null }|null} [data] - Previously fetched metadata.
 * @returns {Promise<string|null>} The stored or provided tagline, or null.
 */
const getTagline = async (allocineHomepage, data) => {
  try {
    const storedData = await collectionData.findOne(
      { _id: b64Encode(allocineHomepage) },
      { projection: { _id: 0, tagline: 1 } },
    );
    if (storedData?.tagline?.trim()) return storedData.tagline;

    return data?.tagline?.trim() ? data.tagline : null;
  } catch (error) {
    logErrors(error, allocineHomepage, "getTagline");
  }
};

module.exports = { getTagline };
