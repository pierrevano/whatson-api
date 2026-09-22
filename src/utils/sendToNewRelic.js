let newrelic;
const isNewRelicEnabled =
  !process.env.DISABLE_NEW_RELIC || process.env.DISABLE_NEW_RELIC !== "true";

if (isNewRelicEnabled) {
  newrelic = require("newrelic");
}

/**
 * Ignores the current transaction.
 *
 * @returns {void}
 */
function ignoreNewRelicTransaction() {
  if (newrelic) newrelic.getTransaction().ignore();
}

/**
 * Adds request metadata and applies reporting rules.
 *
 * @param {import("express").Request} req - Express request.
 * @param {string|null} api_key_query - API key value.
 * @param {object|null} internal_api_key - API key document.
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

  if (isInternalApiKeyValid) {
    ignoreNewRelicTransaction();
    return;
  }

  const attributes = customAttributes ?? req.query;
  console.log("New Relic custom attributes:", attributes);

  if (!newrelic) {
    return;
  }

  newrelic.addCustomAttributes(attributes);
}

/**
 * Reports response details without duplicates.
 *
 * @param {object|null} data - Source payload.
 * @param {object|null} responseWithCode - Response payload.
 * @param {number} statusCode - HTTP status code.
 * @param {Error|null} [error] - Optional exception.
 * @param {import("express").Response} [res] - Express response.
 * @returns {void}
 */
function reportError(data, responseWithCode, statusCode, error, res) {
  if (statusCode < 400) return;

  if (res) {
    if (res.locals.newRelicErrorReported) return;
    res.locals.newRelicErrorReported = true;
  }

  if (!newrelic) {
    return;
  }

  if (error) {
    newrelic.noticeError(error, {
      statusCode,
      ...error.newRelicAttributes,
    });
    return;
  }

  const errorMessage = (data && data.message) || "Unknown error";
  error = new Error(errorMessage);

  newrelic.noticeError(error, {
    statusCode,
    response: JSON.stringify(responseWithCode),
  });
}

/**
 * Reports completed responses when applicable.
 *
 * @param {import("express").Request} _req - Express request.
 * @param {import("express").Response} res - Express response.
 * @param {import("express").NextFunction} next - Next middleware callback.
 * @returns {void}
 */
function reportErrorResponses(_req, res, next) {
  res.once("prefinish", () => {
    const statusCode = res.statusCode;
    reportError(
      { message: `HTTP ${statusCode}` },
      { code: statusCode },
      statusCode,
      undefined,
      res,
    );
  });

  next();
}

module.exports = {
  ignoreNewRelicTransaction,
  reportError,
  reportErrorResponses,
  sendToNewRelic,
};
