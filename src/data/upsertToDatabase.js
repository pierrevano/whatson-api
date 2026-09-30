const { b64Encode } = require("../utils/b64EncodeAndDecode");
const { logErrors } = require("../utils/logErrors");
const { logResetValues } = require("../utils/logResetValues");

/**
 * Upserts data unless it would reset a stored value or decrease a protected count.
 * @param {string} allocineHomepage - Allocine homepage URL used for the _id.
 * @param {object} collectionData - The collection to upsert the data to.
 * @param {object} data - The data to upsert to the database.
 * @param {boolean} isEqual - Whether the remote and local payloads already match.
 * @param {string} allocineURL - The AlloCiné URL
 * @returns {Promise<boolean>} Whether the item was upserted.
 */
const upsertToDatabase = async (
  allocineHomepage,
  collectionData,
  data,
  isEqual,
  allocineURL,
) => {
  try {
    console.log("Updating all item info:", !isEqual);
    if (!isEqual) {
      console.log(data);
    }
    console.log();

    const filter = { _id: b64Encode(allocineHomepage) };
    const storedData = await collectionData.findOne(filter, {
      projection: { _id: 0 },
    });

    if (logResetValues(data, storedData, allocineURL)) {
      console.log(
        `Skipping update for ${allocineHomepage} because a value would be reset or a count would decrease.`,
      );
      return false;
    }

    const updateDoc = { $set: data };
    const options = { upsert: true };

    await collectionData.updateOne(filter, updateDoc, options);
    return true;
  } catch (error) {
    logErrors(error, allocineHomepage, "upsertToDatabase");
  }
};

module.exports = { upsertToDatabase };
