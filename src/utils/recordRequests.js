const { collectionData, collectionRequests } = require("./mongoClient");
const { getApiKey } = require("../routes/utils/getApiKey");

/**
 * Records item requests.
 * @param {import("express").Request} req - Express request.
 * @param {object} data - Response data.
 * @returns {Promise<void>}
 */
const recordRequests = async (req, data) => {
  if (process.env.RECORD_REQUESTS !== "true") return;
  if (!/^\/(movie|tvshow)\/:id(?:\/|$)/.test(req?.route?.path)) return;

  const lastRequestedAt = new Date();

  try {
    const apiKey = await getApiKey(req.query.api_key);
    if (apiKey?.is_internal) return;

    const { id, item_type } = data;
    const item = data.allocine
      ? data
      : await collectionData.findOne(
          { id, item_type },
          { projection: { "allocine.url": 1 } },
        );
    const allocineURL = new URL(item.allocine.url).pathname;

    await collectionRequests.updateOne(
      { _id: allocineURL },
      {
        $setOnInsert: { id, item_type },
        $max: { last_requested_at: lastRequestedAt },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("Failed to record item request:", error);
  }
};

module.exports = { recordRequests };
