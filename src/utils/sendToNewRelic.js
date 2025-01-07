let newrelic;
const isNewRelicEnabled =
  !process.env.DISABLE_NEW_RELIC || process.env.DISABLE_NEW_RELIC !== "true";

if (isNewRelicEnabled) {
  newrelic = require("newrelic");
}

function sendToNewRelic(
  req,
  api_key_query,
  internal_api_key,
  rateLimitHeaders,
) {
  if (!newrelic) {
    console.log("New Relic is not enabled.");
    return;
  }

  const isInternalApiKeyValid =
    internal_api_key && api_key_query === internal_api_key.value;
  if (isInternalApiKeyValid) {
    const transaction = newrelic.getTransaction();
    transaction.ignore();
    return;
  }

  const attributes = rateLimitHeaders ? rateLimitHeaders : req.query;
  console.log("New Relic custom attributes:", attributes);
  newrelic.addCustomAttributes(attributes);
}

function reportError(data, responseWithCode, statusCode, error) {
  if (!newrelic) {
    console.log("New Relic is not enabled.");
    return;
  }

  if (error) {
    newrelic.noticeError(error);
    return;
  }

  const errorMessage = (data && data.message) || "Unknown error";
  error = new Error(errorMessage);

  newrelic.noticeError(error, {
    statusCode,
    response: responseWithCode,
  });
}

module.exports = {
  sendToNewRelic,
  reportError,
};
