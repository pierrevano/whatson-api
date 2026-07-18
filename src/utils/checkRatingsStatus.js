const axios = require("axios");

const { getNodeVarsValues } = require("./getNodeVarsValues");

/**
 * Checks whether a homepage responds with a given status.
 *
 * @param {string|null|undefined} homepage - Homepage URL to probe.
 * @param {string} serviceName - Service name for logging.
 * @param {string|number|null|undefined} id - Service-specific identifier.
 * @param {number} [statusCode=403] - HTTP status to detect.
 * @returns {Promise<boolean>} True when the status is detected, otherwise false.
 */
const isHomepageBlocked = async (
  homepage,
  serviceName,
  id,
  statusCode = 403,
) => {
  try {
    const response = await axios.get(homepage, { validateStatus: () => true });

    if (response.status === statusCode) {
      console.log(
        `${serviceName} homepage status ${statusCode} - ${homepage} - ${id}`,
      );
    }

    return response.status === statusCode;
  } catch (error) {
    const status = error?.response?.status;

    if (status === statusCode) {
      console.log(
        `${serviceName} homepage status ${statusCode} - ${homepage} - ${id}`,
      );
    }

    return status === statusCode;
  }
};

/**
 * Checks whether the Metacritic homepage is returning a blocked status in CircleCI runs.
 *
 * @param {{ metacriticHomepage: string|null, metacriticId: string|number|null }} params
 * @returns {Promise<{ errorMetacritic: boolean }>}
 */
const checkRatingsStatus = async ({ metacriticHomepage, metacriticId }) => {
  if (getNodeVarsValues.environment === "local") {
    return { errorMetacritic: false };
  }

  const errorMetacritic = await isHomepageBlocked(
    metacriticHomepage,
    "Metacritic",
    metacriticId,
  );

  return { errorMetacritic };
};

module.exports = { checkRatingsStatus };
