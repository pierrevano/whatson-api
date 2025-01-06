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
    return;
  }

  const attributes = rateLimitHeaders ? rateLimitHeaders : req.query;
  console.log("New Relic custom attributes:", attributes);
  newrelic.addCustomAttributes(attributes);
}

module.exports = sendToNewRelic;
