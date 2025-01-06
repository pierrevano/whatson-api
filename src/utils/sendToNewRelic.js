const newrelic = require("newrelic");

function sendToNewRelic(
  req,
  api_key_query,
  internal_api_key,
  rateLimitHeaders,
) {
  const isInternalApiKeyValid =
    internal_api_key && api_key_query === internal_api_key.value;
  const isAgentDisabled = process.env.NEW_RELIC_AGENT === "false";

  if (isInternalApiKeyValid || isAgentDisabled) {
    const transaction = newrelic.getTransaction();
    transaction.ignore();
  } else {
    if (rateLimitHeaders) {
      newrelic.addCustomAttributes(rateLimitHeaders);
    } else {
      newrelic.addCustomAttributes(req.query);
    }
  }
}

module.exports = sendToNewRelic;
