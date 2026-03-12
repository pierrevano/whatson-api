const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");

/**
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @param {string} origin - Caller name used for request logging.
 * @returns {object|null} Parsed NEXT_DATA payload, or null when unavailable.
 */
const getNextData = async (imdbHomepage, origin) => {
  const parentalGuideUrl = `${imdbHomepage}${config.imdbParentalGuidePath}`;

  try {
    const $ = await getCheerioContent(parentalGuideUrl, undefined, origin);

    if (typeof $ !== "function") {
      throw (
        $?.error || new Error("IMDb parental guide payload is unavailable.")
      );
    }

    const jsonText = $("#__NEXT_DATA__").html();

    return jsonText ? JSON.parse(jsonText) : null;
  } catch (error) {
    logErrors(error, parentalGuideUrl, origin);

    return null;
  }
};

/**
 * @param {object|null} nextData - Parsed IMDb NEXT_DATA payload.
 * @returns {Array<object>} Certificate edges from the IMDb payload.
 */
const getCertificateEdges = (nextData) =>
  nextData?.props?.pageProps?.contentData?.data?.title?.certificates?.edges ||
  [];

/**
 * @param {object|null} nextData - Parsed IMDb NEXT_DATA payload.
 * @param {string} countryId - Country id to match in the certificates list.
 * @returns {string|null} Trimmed certification rating for the requested country.
 */
const getCertificationRating = (nextData, countryId) => {
  const certificateEdges = getCertificateEdges(nextData);
  const certificate = certificateEdges.find(
    (edge) => edge?.node?.country?.id === countryId,
  );

  return certificate?.node?.rating?.trim?.() || null;
};

/**
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @returns {Promise<{
 *   certification: string|null,
 *   certificationVariants: Record<string, string|null>
 * }>} Certification values derived from the parental guide payload.
 */
const getCertification = async (imdbHomepage) => {
  const nextData = await getNextData(imdbHomepage, "getCertification");

  return {
    certification: getCertificationRating(nextData, "US"),
    certificationVariants: {
      fr: getCertificationRating(nextData, "FR"),
    },
  };
};

module.exports = {
  getCertification,
  getNextData,
};
