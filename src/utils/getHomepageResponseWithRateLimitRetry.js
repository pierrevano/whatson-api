const { getHomepageResponse } = require("./getHomepageResponse");
const { getRateLimitWaitMs } = require("./getRateLimitWaitMs");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches a homepage response and retries once when a rate-limit status is returned.
 *
 * @param {string} homepageUrl - The absolute homepage URL to call.
 * @param {{
 *   serviceName?: string,
 *   id?: string|number,
 *   allowedStatuses?: number[],
 *   requestConfig?: import("axios").AxiosRequestConfig,
 *   rateLimitStatus?: number,
 *   rateLimitHitMessage?: string,
 *   rateLimitStillActiveMessage?: string
 * }} [options={}] - Homepage request metadata plus optional rate-limit messages.
 * @returns {Promise<import("axios").AxiosResponse>} The final axios response.
 */
const getHomepageResponseWithRateLimitRetry = async (
  homepageUrl,
  options = {},
) => {
  const {
    rateLimitStatus = 429,
    rateLimitHitMessage = "Rate limit hit.",
    rateLimitStillActiveMessage = "Rate limit still active after retry.",
    ...homepageOptions
  } = options;

  let response = await getHomepageResponse(homepageUrl, homepageOptions);

  if (response.status !== rateLimitStatus) {
    return response;
  }

  const waitMs = getRateLimitWaitMs(response.headers);

  if (waitMs > 0) {
    console.log(
      `${rateLimitHitMessage} Waiting ${Math.ceil(waitMs / 1000)}s before retrying...`,
    );
    await delay(waitMs);
  }

  const retryAllowedStatuses = Array.isArray(homepageOptions.allowedStatuses)
    ? homepageOptions.allowedStatuses.filter(
        (status) => status !== rateLimitStatus,
      )
    : homepageOptions.allowedStatuses;

  try {
    return await getHomepageResponse(homepageUrl, {
      ...homepageOptions,
      allowedStatuses: retryAllowedStatuses,
    });
  } catch (error) {
    if (error?.response?.status === rateLimitStatus) {
      console.log(rateLimitStillActiveMessage);
    }

    throw error;
  }
};

module.exports = { getHomepageResponseWithRateLimitRetry };
