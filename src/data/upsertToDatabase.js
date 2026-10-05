const { b64Encode } = require("../utils/b64EncodeAndDecode");
const { config } = require("../config");
const { logErrors } = require("../utils/logErrors");
const { logResetValues } = require("../utils/logResetValues");

/**
 * Upserts data when it passes the validation checks.
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

    const releaseDateCutoff = new Date();
    releaseDateCutoff.setDate(
      releaseDateCutoff.getDate() + config.maxDaysInFuture,
    );
    releaseDateCutoff.setHours(23, 59, 59, 999);
    if (new Date(data.release_date) > releaseDateCutoff) {
      console.log(
        `Skipping update for ${allocineHomepage} because its release date exceeds the cutoff.`,
      );
      return false;
    }

    const filter = { _id: b64Encode(allocineHomepage) };
    const storedData = await collectionData.findOne(filter, {
      projection: { _id: 0 },
    });

    if (logResetValues(data, storedData, allocineURL)) {
      console.log(
        `Skipping update for ${allocineHomepage} because a value would be reset.`,
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
