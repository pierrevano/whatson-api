const { b64Encode } = require("../src/utils/b64EncodeAndDecode");

/**
 * Upserts the given data to the database collection.
 * @param {object} data - The data to upsert to the database.
 * @param {object} collectionData - The collection to upsert the data to.
 * @returns {void}
 */
const upsertToDatabase = async (data, collectionData) => {
  try {
    console.log(data);
    console.log();

    const filter = { _id: b64Encode(data.allocine.url) };
    const options = { upsert: true };
    const updateDoc = { $set: data };

    await collectionData.updateOne(filter, updateDoc, options);
  } catch (error) {
    throw new Error(`upsertToDatabase: ${error}`);
  }
};

module.exports = { upsertToDatabase };
