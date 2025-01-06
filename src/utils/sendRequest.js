let newrelic;
if (process.env.NODE_ENV !== "test") {
  newrelic = require("newrelic");
}

const sendResponse = (res, statusCode, data) => {
  if (statusCode === 200) {
    return res.status(statusCode).json(data);
  } else {
    const responseWithCode = {
      ...data,
      code: statusCode,
    };

    newrelic.noticeError(new Error(data.message || "Unknown error"), {
      statusCode,
      response: responseWithCode,
    });

    return res.status(statusCode).json(responseWithCode);
  }
};

const sendRequest = (
  req,
  res,
  json,
  item_type_query,
  limit,
  config,
  is_active_item,
) => {
  const { keysToCheckForSearch, maxMongodbItemsLimit } = config;
  const areNoResults = json && json.results && json.results.length === 0;
  const isValidItemType = [
    "movie",
    "tvshow",
    "movie,tvshow",
    "tvshow,movie",
  ].includes(item_type_query);
  const isQuerySearchKeyMissing = keysToCheckForSearch.every((key) => {
    return !Object.keys(req.query).some(
      (queryKey) => queryKey.toLowerCase() === key.toLowerCase(),
    );
  });

  if (
    areNoResults &&
    (!item_type_query || !isValidItemType) &&
    isQuerySearchKeyMissing
  ) {
    return sendResponse(res, 404, {
      message:
        "Invalid item type provided. Please specify 'movie', 'tvshow', or a combination like 'movie,tvshow'.",
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

  if (limit && limit > maxMongodbItemsLimit) {
    return sendResponse(res, 400, {
      message: `Limit exceeds maximum allowed (${maxMongodbItemsLimit}). Please reduce the limit.`,
    });
  }

  return sendResponse(res, 200, json);
};

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
    return sendResponse(res, 403, {
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
      newrelic.noticeError(error);

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
      newrelic.noticeError(error);

      return sendResponse(res, 500, { message: error.message });
    }
  }
};

const sendInternalError = async (res, error) => {
  newrelic.noticeError(error);

  return sendResponse(res, 500, { message: error.message });
};

module.exports = {
  sendInternalError,
  sendPreferencesRequest,
  sendRequest,
  sendResponse,
};
