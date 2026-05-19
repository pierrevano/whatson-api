const { collectionData } = require("../utils/mongoClient");
const { config } = require("../config");
const { getApiKey } = require("../utils/getApiKey");
const { invalidItemTypeMessage } = require("../utils/itemTypeValidation");
const { isSponsorApiKey } = require("../utils/isSponsorApiKey");
const { sendInternalError, sendResponse } = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const getInternalApiKey = require("./getInternalApiKey");

/**
 * Returns paginated TMDB IDs grouped by item type for items added or updated since a given timestamp.
 * Requires a sponsor API key.
 *
 * @param {import("express").Request} req - Express request with since, item_type, page, and limit query params.
 * @param {import("express").Response} res - Express response.
 * @returns {Promise<void>}
 */
const getUpdates = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    const apiKeyDoc = await getApiKey(api_key_query);
    if (!isSponsorApiKey(apiKeyDoc)) {
      return sendResponse(res, 403, {
        message: `This endpoint requires a sponsor API key. Become a sponsor for access: ${config.contactURL}`,
      });
    }

    const { since } = req.query;
    if (!since) {
      return sendResponse(res, 400, {
        message: "The 'since' parameter is required.",
      });
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return sendResponse(res, 400, {
        message:
          "The 'since' parameter must be a valid ISO 8601 date string (e.g. 2026-01-01T00:00:00.000Z).",
      });
    }

    const requestedTypes = req.query.item_type?.split(",");
    const itemTypes = config.itemTypes.filter(
      (t) => !requestedTypes || requestedTypes.includes(t),
    );

    if (itemTypes.length === 0) {
      return sendResponse(res, 400, {
        message: invalidItemTypeMessage(req.query.item_type),
      });
    }

    const page = Number(req.query.page) || config.page;
    const limit = Number(req.query.limit) || config.limit;

    const internal_api_key = await getInternalApiKey();
    sendToNewRelic(req, api_key_query, internal_api_key, {
      ...req.query,
      new_relic_route: "getUpdates",
    });

    const matchStage = { updated_at: { $gte: sinceDate.toISOString() } };
    if (itemTypes.length < config.itemTypes.length) {
      matchStage.item_type = itemTypes[0];
    }

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          results: [
            { $sort: { updated_at: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { _id: 0, id: 1, item_type: 1 } },
          ],
          total_count: [{ $count: "count" }],
        },
      },
    ];

    const items = await collectionData.aggregate(pipeline).toArray();
    const results = items[0]?.results || [];
    const total_results = items[0]?.total_count?.[0]?.count || 0;

    const updated = {};
    for (const type of itemTypes) {
      updated[type] = results
        .filter((r) => r.item_type === type)
        .map((r) => r.id);
    }

    return sendResponse(res, 200, {
      page,
      updated,
      total_pages: Math.ceil(total_results / limit),
      total_results,
    });
  } catch (error) {
    return sendInternalError(res, error);
  }
};

module.exports = getUpdates;
