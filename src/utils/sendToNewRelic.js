let newrelic;
const isNewRelicEnabled =
  !process.env.DISABLE_NEW_RELIC || process.env.DISABLE_NEW_RELIC !== "true";

if (isNewRelicEnabled) {
  newrelic = require("newrelic");
}

/**
 * Adds request-specific metadata to New Relic unless the internal API key is used.
 *
 * @param {import("express").Request} req - The processed request.
 * @param {string|undefined} api_key_query - API key provided by the consumer.
 * @param {{value: string}|null} internal_api_key - Cached internal API key document.
 * @param {Record<string, string|number>|undefined} customAttributes - Optional attributes to send.
 * @returns {void}
 */
function sendToNewRelic(
  req,
  api_key_query,
  internal_api_key,
  customAttributes,
) {
  const isInternalApiKeyValid =
    internal_api_key && api_key_query === internal_api_key.value;
  const attributes = customAttributes ? customAttributes : req.query;
  console.log("New Relic custom attributes:", attributes);

  if (!newrelic) {
    return;
  }

  if (isInternalApiKeyValid) {
    const transaction = newrelic.getTransaction();
    transaction.ignore();
    return;
  }

  newrelic.addCustomAttributes(attributes);
}

/**
 * Reports handled failures back to New Relic to maintain observability on downstream issues.
 *
 * @param {object|null} data - Original payload, used to derive fallback error messages.
 * @param {object|null} responseWithCode - Response returned to the client.
 * @param {number} statusCode - HTTP status associated with the failure.
 * @param {Error|null} [error] - Captured exception when available.
 * @returns {void}
 */
function reportError(data, responseWithCode, statusCode, error) {
  if (!newrelic) {
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
