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
 * Checks whether ratings sources are returning blocked statuses in CircleCI runs.
 *
 * @param {{
 *   imdbHomepage: string|null,
 *   imdbId: string|number|null,
 *   letterboxdHomepage: string|null,
 *   letterboxdId: string|number|null,
 *   metacriticHomepage: string|null,
 *   metacriticId: string|number|null
 * }} params
 * @returns {Promise<{ errorImdb: boolean, errorLetterboxd: boolean, errorMetacritic: boolean }>}
 */
const checkRatingsStatus = async ({
  imdbHomepage,
  imdbId,
  letterboxdHomepage,
  letterboxdId,
  metacriticHomepage,
  metacriticId,
}) => {
  if (getNodeVarsValues.environment === "local") {
    return {
      errorImdb: false,
      errorLetterboxd: false,
      errorMetacritic: false,
    };
  }

  const [errorImdb, errorLetterboxd, errorMetacritic] = await Promise.all([
    isHomepageBlocked(imdbHomepage, "IMDb", imdbId, 202),
    isHomepageBlocked(letterboxdHomepage, "Letterboxd", letterboxdId),
    isHomepageBlocked(metacriticHomepage, "Metacritic", metacriticId),
  ]);

  return {
    errorImdb,
    errorLetterboxd,
    errorMetacritic,
  };
};

module.exports = { checkRatingsStatus };
