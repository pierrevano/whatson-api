const {
  areQuerySearchKeysMissing,
} = require("../routes/utils/itemTypeValidation");
const { config } = require("../config");
const { isMongoMemoryLimitError } = require("./mongoMemoryLimitError");
const { reportError } = require("./sendToNewRelic");

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
 * Sends the response with standard error handling.
 *
 * @param {import("express").Request} req - Express request containing the original user query.
 * @param {import("express").Response} res - Express response used to send the outcome.
 * @param {object|null|undefined} json - Aggregated payload returned by the Mongo pipeline.
 * @param {typeof import("../config").config} config - Shared configuration values.
 * @param {{ is_active: boolean }|{ $or: Array<{ is_active: boolean }> }} [is_active_item] - Activity metadata returned by the aggregation pipeline.
 * @returns {import("express").Response} The Express response after being sent.
 */
const sendRequest = (req, res, json, config, is_active_item) => {
  const { keysToCheckForSearch } = config;
  const areNoResults = json && json.results && json.results.length === 0;
  const isQuerySearchKeyMissing = areQuerySearchKeysMissing(
    req.query,
    keysToCheckForSearch,
  );
  const resolveIsActiveValue = () => {
    if (is_active_item) {
      if (typeof is_active_item.is_active !== "undefined") {
        return is_active_item.is_active;
      }

      if (Array.isArray(is_active_item.$or)) {
        const activeFlags = is_active_item.$or
          .map((condition) => condition.is_active)
          .filter((value) => typeof value !== "undefined");

        if (activeFlags.length > 0) {
          return activeFlags.join(",");
        }
      }
    }

    return typeof req.query.is_active !== "undefined"
      ? req.query.is_active
      : "true,false";
  };

  if (!json || areNoResults) {
    const isActiveUndefinedOrMissing = !req.query.is_active;
    const isRootPath = req.path === "/";
    const errorMessage = `${config.noMatchingItemsFoundMessage}${
      isActiveUndefinedOrMissing && isQuerySearchKeyMissing && isRootPath
        ? ` Ensure 'is_active' is correctly set (currently ${resolveIsActiveValue()}).`
        : ""
    }`;

    return sendResponse(res, 404, { message: errorMessage });
  }

  return sendResponse(res, 200, json);
};

/**
 * Retrieves or upserts preferences.
 *
 * @param {import("express").Response} res - Express response used to return the outcome.
 * @param {string} calculatedDigest - Expected digest computed from the email and secret.
 * @param {string|undefined} digest - Digest provided by the caller for verification.
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
      return sendInternalError(res, error);
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
      return sendInternalError(res, error);
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
  console.error("Internal server error:", error);

  reportError(null, null, null, error);

  if (isMongoMemoryLimitError(error)) {
    return sendResponse(res, 500, {
      message: config.queryMemoryLimitMessage,
    });
  }

  return sendResponse(res, 500, { message: "Something went wrong." });
};

const handleRequestError = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  const status = error.status;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return sendResponse(res, status, {
      message: config.invalidRequestMessage,
    });
  }

  return sendInternalError(res, error);
};

module.exports = {
  handleRequestError,
  sendInternalError,
  sendPreferencesRequest,
  sendRequest,
  sendResponse,
};
