const { reportError } = require("./sendToNewRelic");
const {
  areQuerySearchKeysMissing,
  invalidItemTypeMessage,
  isValidItemType,
} = require("./itemTypeValidation");

/**
 * Normalises Express responses by attaching a status code and optional payload, while reporting
 * non-success cases to New Relic for observability.
 *
 * @param {import("express").Response} res - Express response instance.
 * @param {number} statusCode - HTTP status code to return.
 * @param {object} data - Payload (already shaped) to serialise in the response body.
 * @returns {import("express").Response} The Express response after being written.
 */
const sendResponse = (res, statusCode, data) => {
  if (statusCode === 200) {
    return res.status(statusCode).json(data);
  } else {
    const responseWithCode = {
      ...data,
      code: statusCode,
    };

    reportError(data, responseWithCode, statusCode);

    return res.status(statusCode).json(responseWithCode);
  }
};

/**
 * Validates query parameters, applies standard error handling, and ultimately dispatches
 * the response payload produced by the aggregation helpers.
 *
 * @param {import("express").Request} req - Express request containing the original user query.
 * @param {import("express").Response} res - Express response used to send the outcome.
 * @param {object|null} json - Aggregated payload returned by the Mongo pipeline.
 * @param {string|undefined} item_type_query - Original `item_type` query parameter.
 * @param {number|undefined} limit - Resolved page size used for validation.
 * @param {typeof import("../config").config} config - Shared configuration values.
 * @param {{ is_active: boolean }} [is_active_item] - Activity metadata returned by the aggregation pipeline.
 * @returns {import("express").Response} The Express response after being sent.
 */
const sendRequest = (
  req,
  res,
  json,
  item_type_query,
  limit,
  config,
  is_active_item,
) => {
  const allowedParams = [
    ...config.allowedQueryParams,
    ...config.keysToCheckForSearch,
  ];

  const invalidParams = Object.keys(req.query).filter(
    (key) => !allowedParams.includes(key.toLowerCase()),
  );

  if (invalidParams.length > 0) {
    return sendResponse(res, 400, {
      message: `Invalid query parameter(s): ${invalidParams.join(", ")}`,
    });
  }

  const { keysToCheckForSearch, maxLimit } = config;
  const areNoResults = json && json.results && json.results.length === 0;
  const isQuerySearchKeyMissing = areQuerySearchKeysMissing(
    req.query,
    keysToCheckForSearch,
  );

  if (!isValidItemType(item_type_query)) {
    return sendResponse(res, 400, {
      message: invalidItemTypeMessage,
    });
  }

  if (!json || areNoResults) {
    const isActiveUndefinedOrMissing =
      !req.query.is_active || typeof req.query.is_active === "undefined";
    const isRootPath = req.path === "/";
    const errorMessage = `No matching items found.${
      isActiveUndefinedOrMissing && isQuerySearchKeyMissing && isRootPath
        ? ` Ensure 'is_active' is correctly set (currently ${is_active_item.is_active}).`
        : ""
    }`;

    return sendResponse(res, 404, { message: errorMessage });
  }

  if (limit && limit > maxLimit) {
    return sendResponse(res, 400, {
      message: `The limit exceeds maximum allowed (${maxLimit}). Please reduce the limit.`,
    });
  }

  return sendResponse(res, 200, json);
};

/**
 * Authorises and serves the preferences API, supporting both retrieval and upsert operations
 * depending on the `post` flag.
 *
 * @param {import("express").Response} res - Express response used to return the outcome.
 * @param {string} calculatedDigest - Expected digest computed from the email and secret.
 * @param {string} digest - Digest provided by the caller for verification.
 * @param {import("mongodb").Collection} collectionNamePreferences - Mongo collection storing preferences.
 * @param {string} email - Target email address.
 * @param {object} [preferences] - Preferences payload when performing an update.
 * @param {boolean} [post] - When true, upserts; otherwise retrieves the stored preferences.
 * @returns {Promise<import("express").Response>} The resulting Express response.
 */
const sendPreferencesRequest = async (
  res,
  calculatedDigest,
  digest,
  collectionNamePreferences,
  email,
  preferences,
  post,
) => {
  if (calculatedDigest !== digest) {
    return sendResponse(res, 401, {
      message: "Unauthorized access: The provided digest is invalid.",
    });
  }

  if (post) {
    const filter = { email };
    const updateDoc = { $set: preferences };
    const options = { upsert: true };

    try {
      await collectionNamePreferences.updateOne(filter, updateDoc, options);

      return sendResponse(res, 200, {
        message: "Preferences have been successfully updated.",
      });
    } catch (error) {
      reportError(null, null, null, error);

      return sendResponse(res, 500, { message: error.message });
    }
  } else {
    try {
      const preferences = await collectionNamePreferences.findOne({ email });

      if (!preferences) {
        return sendResponse(res, 404, {
          message: "Preferences not found for the given email.",
        });
      } else {
        return sendResponse(res, 200, preferences);
      }
    } catch (error) {
      reportError(null, null, null, error);

      return sendResponse(res, 500, { message: error.message });
    }
  }
};

/**
 * Handles unexpected exceptions by logging them to New Relic and returning a generic 500 payload.
 *
 * @param {import("express").Response} res - Express response instance.
 * @param {Error} error - Captured error to forward to observability tooling.
 * @returns {Promise<import("express").Response>} The generated error response.
 */
const sendInternalError = async (res, error) => {
  reportError(null, null, null, error);

  return sendResponse(res, 500, { message: error.message });
};

module.exports = {
  sendInternalError,
  sendPreferencesRequest,
  sendRequest,
  sendResponse,
};
