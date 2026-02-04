const axios = require("axios");

const { getNodeVarsValues } = require("./getNodeVarsValues");

/**
 * Checks whether a homepage responds with a 403 status.
 *
 * @param {string|null|undefined} homepage - Homepage URL to probe.
 * @param {string} serviceName - Service name for logging.
 * @param {string|number|null|undefined} id - Service-specific identifier.
 * @returns {Promise<boolean>} True when a 403 is detected, otherwise false.
 */
const isHomepageBlocked = async (homepage, serviceName, id) => {
  try {
    const response = await axios.get(homepage, { validateStatus: () => true });

    if (response.status === 403) {
      console.log(`${serviceName} homepage status 403 - ${homepage} - ${id}`);
    }

    return response.status === 403;
  } catch (error) {
    const status = error?.response?.status;

    if (status === 403) {
      console.log(`${serviceName} homepage status 403 - ${homepage} - ${id}`);
    }

    return status === 403;
  }
};

/**
 * Checks whether ratings sources are returning 403 in CircleCI runs.
 *
 * @param {{
 *   metacriticHomepage: string|null,
 *   metacriticId: string|number|null,
 *   letterboxdHomepage: string|null,
 *   letterboxdId: string|number|null
 * }} params
 * @returns {Promise<{ errorMetacritic: boolean, errorLetterboxd: boolean }>}
 */
const checkRatings403 = async ({
  metacriticHomepage,
  metacriticId,
  letterboxdHomepage,
  letterboxdId,
}) => {
  if (getNodeVarsValues.environment === "local") {
    return { errorMetacritic: false, errorLetterboxd: false };
  }

  const [errorMetacritic, errorLetterboxd] = await Promise.all([
    isHomepageBlocked(metacriticHomepage, "Metacritic", metacriticId),
    isHomepageBlocked(letterboxdHomepage, "Letterboxd", letterboxdId),
  ]);

  return {
    errorMetacritic,
    errorLetterboxd,
  };
};

module.exports = { checkRatings403 };
