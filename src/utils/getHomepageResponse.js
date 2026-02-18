const axios = require("axios");

/**
 * Fetches a homepage URL and exits the process when the response status is not allowed.
 *
 * @param {string} homepageUrl - The absolute homepage URL to call.
 * @param {{
 *   serviceName?: string,
 *   id?: string|number,
 *   allowedStatuses?: number[]
 *   requestConfig?: import("axios").AxiosRequestConfig
 * }} [options] - Optional metadata for error messages and allowed HTTP statuses.
 * @returns {Promise<import("axios").AxiosResponse>} The axios response when the status is allowed.
 */
const getHomepageResponse = async (homepageUrl, options = {}) => {
  const {
    serviceName = "Service",
    id,
    allowedStatuses,
    requestConfig,
  } = options;
  const acceptedStatuses =
    Array.isArray(allowedStatuses) && allowedStatuses.length > 0
      ? allowedStatuses
      : [200];

  const response = await axios.get(homepageUrl, {
    ...requestConfig,
    validateStatus: () => true,
  });

  if (!acceptedStatuses.includes(response.status)) {
    const idSuffix = id ? ` - ${id}` : "";
    console.log(
      `${serviceName} homepage returned status ${response.status} - ${homepageUrl}${idSuffix}`,
    );
    process.exit(1);
  }

  return response;
};

module.exports = { getHomepageResponse };
