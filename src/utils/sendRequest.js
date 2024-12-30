const sendResponse = (res, statusCode, data) => {
  if (statusCode === 200) {
    return res.status(statusCode).json(data);
  } else {
    const responseWithCode = {
      ...data,
      code: statusCode,
    };
    return res.status(statusCode).json(responseWithCode);
  }
};

const sendRequest = async (req, res, json, item_type_query, limit, config) => {
  if (
    json &&
    json.results &&
    json.results.length === 0 &&
    (!item_type_query ||
      !["movie", "tvshow", "movie,tvshow", "tvshow,movie"].includes(
        item_type_query,
      )) &&
    config.keysToCheckForSearch.every((key) => !req.query.hasOwnProperty(key))
  ) {
    return sendResponse(res, 404, {
      message: "Item type must be either 'movie', 'tvshow', or 'movie,tvshow'.",
    });
  } else if (!json || (json && json.results && json.results.length === 0)) {
    return sendResponse(res, 404, { message: "No items have been found." });
  } else if (limit && limit > config.maxMongodbItemsLimit) {
    return sendResponse(res, 400, {
      message: `Limit should be lower than ${config.maxMongodbItemsLimit}`,
    });
  } else {
    return sendResponse(res, 200, json);
  }
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
    return sendResponse(res, 403, { message: "Invalid digest." });
  }

  if (post) {
    const filter = { email };
    const updateDoc = { $set: preferences };
    const options = { upsert: true };

    await collectionNamePreferences.updateOne(filter, updateDoc, options);
    return sendResponse(res, 200, {
      message: "Preferences updated successfully.",
    });
  } else {
    const preferences = await collectionNamePreferences.findOne({ email });

    if (!preferences) {
      return sendResponse(res, 404, { message: "Preferences not found." });
    } else {
      return sendResponse(res, 200, preferences);
    }
  }
};

const sendInternalError = async (res, error) => {
  return sendResponse(res, 500, { message: error.message });
};

module.exports = { sendInternalError, sendPreferencesRequest, sendRequest };
