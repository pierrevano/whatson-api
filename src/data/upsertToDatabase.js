const { b64Encode } = require("../utils/b64EncodeAndDecode");

/**
 * Upserts the given data to the database collection.
 * @param {string} allocineHomepage - Allocine homepage URL used for the _id.
 * @param {object} collectionData - The collection to upsert the data to.
 * @param {object} data - The data to upsert to the database.
 * @param {boolean} isEqual - Whether the remote and local payloads already match.
 * @returns {Promise<void>} Resolves when the upsert completes.
 */
const upsertToDatabase = async (
  allocineHomepage,
  collectionData,
  data,
  isEqual,
) => {
  try {
    console.log("Updating all item info:", !isEqual);
    if (!isEqual) {
      console.log(data);
    }
    console.log();

    const filter = { _id: b64Encode(allocineHomepage) };
    const updateDoc = { $set: data };
    const options = { upsert: true };

    await collectionData.updateOne(filter, updateDoc, options);
  } catch (error) {
    throw new Error(`upsertToDatabase: ${error}`);
  }
};

module.exports = { upsertToDatabase };
